
"""Ausencias y resolución empresarial (#15), sobre disponibilidad #69.

No modifica la contratación ni la cancelación normal del cliente.
Las reservas afectadas se calculan; nunca se persiste un estado 'afectada'.
"""

from datetime import date, datetime, time, timedelta
from functools import wraps

from flask import Blueprint, current_app, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import get_jwt_identity
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import selectinload

from api.models import db, Absence, Booking, BookingStatus, Worker, User
from api.availability import (
    can_work, is_free, load_busy, madrid_now, worker_unavailable_days,
)
from api.utils import APIException, role_required


absence_api = Blueprint("absence_api", __name__)
CORS(absence_api)


def transaction(fn):
    """Rollback en errores y liberación de los bloqueos de PostgreSQL."""
    @wraps(fn)
    def wrapped(*args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except APIException:
            db.session.rollback()
            raise
        except SQLAlchemyError:
            db.session.rollback()
            current_app.logger.exception("Error de base de datos en ausencias")
            return jsonify({"message": "No se ha podido guardar la operación."}), 500
    return wrapped


def body_object():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise APIException("Envía un objeto JSON.", 400)
    return data


def parse_day(value, label):
    if not isinstance(value, str):
        raise APIException(f"{label} debe tener formato AAAA-MM-DD.", 400)
    try:
        parsed = date.fromisoformat(value)
    except ValueError:
        raise APIException(f"{label} debe tener formato AAAA-MM-DD.", 400)
    if parsed.isoformat() != value:
        raise APIException(f"{label} debe tener formato AAAA-MM-DD.", 400)
    return parsed


def absence_fields(data):
    start = parse_day(data.get("starts_on"), "Desde")
    end = None if data.get("ends_on") in (
        None, "") else parse_day(data["ends_on"], "Hasta")
    if end is not None and end < start:
        raise APIException("Hasta no puede ser anterior a Desde.", 400)
    reason = data.get("reason")
    if reason not in ("vacaciones", "baja", "otro"):
        raise APIException("El motivo debe ser vacaciones, baja u otro.", 400)
    notes = data.get("notes")
    if notes is not None and (not isinstance(notes, str) or len(notes) > 2000):
        raise APIException(
            "Las notas deben ser texto de hasta 2000 caracteres.", 400)
    return dict(starts_on=start, ends_on=end, reason=reason, notes=(notes or "").strip() or None)


def get_worker(worker_id, lock=False):
    query = db.select(Worker).where(Worker.worker_id == worker_id)
    if lock:
        query = query.with_for_update()
    worker = db.session.execute(query.execution_options(
        populate_existing=True)).scalar_one_or_none()
    if worker is None:
        raise APIException("Trabajador no encontrado.", 404)
    return worker


def own_absence(worker_id, absence_id):
    absence = db.session.get(Absence, absence_id)
    if absence is None or absence.worker_id != worker_id:
        raise APIException("Ausencia no encontrada para este trabajador.", 404)
    return absence


@absence_api.route("/workers/<int:worker_id>/absences", methods=["GET"])
@role_required("manager")
def list_absences(worker_id):
    get_worker(worker_id)
    rows = db.session.execute(
        db.select(Absence).where(Absence.worker_id == worker_id)
        .order_by(Absence.starts_on.desc(), Absence.absence_id.desc())
    ).scalars().all()
    return jsonify({"absences": [row.serialize() for row in rows]})


@absence_api.route("/workers/<int:worker_id>/absences", methods=["POST"])
@role_required("manager")
@transaction
def create_absence(worker_id):
    fields = absence_fields(body_object())
    get_worker(worker_id, lock=True)
    absence = Absence(worker_id=worker_id, **fields)
    db.session.add(absence)
    db.session.commit()
    return jsonify({"absence": absence.serialize()}), 201


@absence_api.route("/workers/<int:worker_id>/absences/<int:absence_id>", methods=["PUT"])
@role_required("manager")
@transaction
def update_absence(worker_id, absence_id):
    fields = absence_fields(body_object())
    get_worker(worker_id, lock=True)
    absence = own_absence(worker_id, absence_id)
    for key, value in fields.items():
        setattr(absence, key, value)
    db.session.commit()
    return jsonify({"absence": absence.serialize()})


@absence_api.route("/workers/<int:worker_id>/absences/<int:absence_id>", methods=["DELETE"])
@role_required("manager")
@transaction
def delete_absence(worker_id, absence_id):
    get_worker(worker_id, lock=True)
    db.session.delete(own_absence(worker_id, absence_id))
    db.session.commit()
    return jsonify({"message": "Ausencia eliminada."})


def occupied_dates(start, end):
    """Días tocados por [inicio, fin): terminar a medianoche no ocupa el siguiente."""
    if end <= start:
        return set()
    last = (end - timedelta(microseconds=1)).date()
    first = start.date()
    return {first + timedelta(days=n) for n in range((last - first).days + 1)}


def affected_reasons(booking, now=None):
    now = now or madrid_now()
    if booking.status not in (BookingStatus.PENDING, BookingStatus.CONFIRMED):
        return []
    remaining = [day for day in booking.days if day.ends_at > now]
    if not remaining:
        return []
    worker = booking.worker
    reasons = []
    if not worker or not worker.is_active or not worker.user or not worker.user.is_active:
        reasons.append("Trabajador desactivado")
    if worker:
        for absence in worker.absences:
            if any(
                absence.starts_on <= day <= (absence.ends_on or date.max)
                for interval in remaining
                for day in occupied_dates(max(interval.starts_at, now), interval.ends_at)
            ):
                reasons.append("Ausencia: " + absence.reason)
    return list(dict.fromkeys(reasons))


def booking_query():
    return db.select(Booking).options(
        selectinload(Booking.days),
        selectinload(Booking.worker).selectinload(Worker.user),
        selectinload(Booking.worker).selectinload(Worker.absences),
    )


def serialize_management(booking, reasons):
    data = booking.serialize()
    data["affected_reasons"] = reasons
    client = db.session.get(User, booking.client_id)
    data["client_name"] = f"{client.name} {client.last_name}" if client else "Cliente"
    return data


@absence_api.route("/manage/bookings/affected", methods=["GET"])
@role_required("manager")
def list_affected():
    now = madrid_now()
    bookings = db.session.execute(booking_query().where(
        Booking.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED]),
        Booking.scheduled_end > now,
    ).order_by(Booking.scheduled_start, Booking.booking_id)).scalars().all()
    affected = [(b, affected_reasons(b, now)) for b in bookings]
    affected = [(b, reasons) for b, reasons in affected if reasons]
    if request.args.get("count_only") == "1":
        return jsonify({"count": len(affected)})
    return jsonify({"count": len(affected), "bookings": [
        serialize_management(b, reasons) for b, reasons in affected
    ]})


def require_affected(booking_id, lock=False):
    query = booking_query().where(Booking.booking_id == booking_id)
    if lock:
        query = query.with_for_update()
    booking = db.session.execute(query.execution_options(
        populate_existing=True)).scalar_one_or_none()
    if booking is None:
        raise APIException("Reserva no encontrada.", 404)
    if not affected_reasons(booking):
        raise APIException(
            "La reserva ya no está afectada. Actualiza la lista.", 409)
    return booking


def replacement_workers(booking, lock=False):
    """Comprueba TODOS los días originales; nunca desplaza la reserva.

    No aplica MIN_NOTICE ni BOOKING_HORIZON: resolver imprevistos no es
    crear una reserva nueva. Conserva turno, días y margen de 30 minutos.
    """
    intervals = [(day.starts_at, day.ends_at) for day in booking.days]
    if not intervals or any(end <= start for start, end in intervals):
        return []
    query = db.select(Worker).order_by(Worker.worker_id).options(
        selectinload(Worker.user), selectinload(
            Worker.shift), selectinload(Worker.absences)
    )
    if lock:
        # Orden estable: también serializa cambios de ausencia contra resolución.
        query = query.with_for_update()
    workers = db.session.execute(query.execution_options(
        populate_existing=True)).scalars().all()
    first = min(start.date() for start, _ in intervals)
    last = max(end.date() for _, end in intervals)
    busy = load_busy(workers, first, last,
                     exclude_booking_id=booking.booking_id)
    candidates = []
    for worker in workers:
        if worker.worker_id == booking.worker_id or not can_work(worker):
            continue
        unavailable = worker_unavailable_days(worker, first, last)
        fits = all(
            start.date() == end.date()
            and start.isoweekday() in worker.shift.days
            and start.date() not in unavailable
            and datetime.combine(start.date(), worker.shift.start_time) <= start
            and end <= datetime.combine(start.date(), worker.shift.end_time)
            for start, end in intervals
        )
        if fits and is_free(intervals, busy.get(worker.worker_id, [])):
            candidates.append(worker)
    return candidates


@absence_api.route("/manage/bookings/<int:booking_id>/replacements", methods=["GET"])
@role_required("manager")
def list_replacements(booking_id):
    booking = require_affected(booking_id)
    return jsonify({"workers": [worker.serialize() for worker in replacement_workers(booking)]})


@absence_api.route("/manage/bookings/<int:booking_id>/reassign", methods=["POST"])
@role_required("manager")
@transaction
def reassign_booking(booking_id):
    worker_id = body_object().get("worker_id")
    if type(worker_id) is not int or worker_id <= 0:
        raise APIException("Selecciona un trabajador válido.", 400)
    booking = require_affected(booking_id, lock=True)
    candidates = replacement_workers(booking, lock=True)
    # Los bloqueos pueden haber esperado una edición de ausencias.
    db.session.refresh(booking.worker, ["absences", "is_active"])
    if not affected_reasons(booking):
        raise APIException("La reserva ya no está afectada.", 409)
    if worker_id not in {worker.worker_id for worker in candidates}:
        raise APIException(
            "El trabajador ya no está disponible todos los días. Actualiza las opciones.", 409)
    booking.worker = next(w for w in candidates if w.worker_id == worker_id)
    booking.status = BookingStatus.CONFIRMED
    booking.updated_at = madrid_now()
    db.session.commit()
    return jsonify({"message": "Reserva reasignada.", "booking": booking.serialize()})


@absence_api.route("/manage/bookings/<int:booking_id>/cancel-company", methods=["POST"])
@role_required("manager")
@transaction
def cancel_company(booking_id):
    reason = body_object().get("reason")
    if not isinstance(reason, str) or not reason.strip() or len(reason.strip()) > 1000:
        raise APIException(
            "Indica un motivo de cancelación de entre 1 y 1000 caracteres.", 400)
    booking = require_affected(booking_id, lock=True)
    candidates = replacement_workers(booking, lock=True)
    db.session.refresh(booking.worker, ["absences", "is_active"])
    if not affected_reasons(booking):
        raise APIException("La reserva ya no está afectada.", 409)
    if candidates:
        raise APIException(
            "Hay trabajadores disponibles: reasigna la reserva.", 409)
    booking.status = BookingStatus.CANCELLED
    booking.cancelled_by_company = True
    booking.cancellation_reason = reason.strip()
    booking.updated_at = madrid_now()
    db.session.commit()
    return jsonify({"message": "Reserva cancelada por CleanFlow.", "booking": booking.serialize()})


# Vista mínima de integración con #16, ausente en el ZIP de partida.
@absence_api.route("/bookings", methods=["GET"])
@absence_api.route("/my/bookings", methods=["GET"])
@role_required("client")
def my_bookings():
    user_id = int(get_jwt_identity())
    requested_client_id = request.args.get("client_id")

    if requested_client_id is not None:
        try:
            requested_client_id = int(requested_client_id)
        except ValueError:
            return jsonify({"message": "client_id debe ser un entero."}), 400

        if requested_client_id != user_id:
            return jsonify({
                "message": "Solo puedes consultar tus propias reservas."
            }), 403

    bookings = db.session.execute(
        booking_query().options(
            selectinload(Booking.service),
            selectinload(Booking.address),
        ).where(
            Booking.client_id == user_id
        ).order_by(
            Booking.scheduled_start.desc(),
            Booking.booking_id.desc(),
        )
    ).scalars().all()

    return jsonify({
        "bookings": [booking.serialize() for booking in bookings]
    })
