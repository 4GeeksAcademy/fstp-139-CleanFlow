"""
DISPONIBILIDAD: cuándo se puede reservar a cada trabajador (#69).

Un trabajador está libre para una reserva si cada tramo cae en un día
laborable suyo, cabe entero en su turno y no choca con sus otras reservas
(con 30 minutos de margen).

    1. Reglas      las constantes: jornada, margen, ventana de reserva
    2. Piezas      funciones pequeñas, cada una responde una pregunta
    3. Juntarlas   los huecos de un mes y a quién asignar

Todo es cálculo puro (fácil de probar en `flask shell`) salvo load_busy(),
la única que consulta la base de datos. Las fechas son hora de Madrid sin
zona, como se guardan las reservas.
"""

from collections import defaultdict
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from api.models import db, Booking, BookingDay, BookingStatus


# ----------------------------------------------------------------------
# 1. REGLAS
# ----------------------------------------------------------------------

# Jornada máxima, la duración de un turno: una reserva más larga se reparte
# en días (12 h = 8 + 4).
MAX_HOURS_PER_DAY = 8

# Hueco entre dos reservas del mismo trabajador, para desplazarse.
TRAVEL_MARGIN = timedelta(minutes=30)

# Tope al buscar días laborables. Sin él, una baja indefinida (#15)
# dejaría el bucle buscando para siempre.
SEARCH_LIMIT_DAYS = 60

# Ventana de reserva: de 24 h a 60 días vista. La #14 usa estas mismas.
MIN_NOTICE = timedelta(hours=24)
BOOKING_HORIZON = timedelta(days=60)

# Las horas de inicio van de media en media hora.
SLOT_STEP = timedelta(minutes=30)

MADRID = ZoneInfo("Europe/Madrid")


def madrid_now():
    """Ahora en Madrid, sin zona: el mismo tipo que las reservas."""
    return datetime.now(MADRID).replace(tzinfo=None)


# ----------------------------------------------------------------------
# 2. PIEZAS
# ----------------------------------------------------------------------

def split_into_days(hours):
    """Las horas en tramos de un día: 9 -> [8, 1] · 12 -> [8, 4]."""
    full_days, rest = divmod(hours, MAX_HOURS_PER_DAY)
    return [MAX_HOURS_PER_DAY] * full_days + ([rest] if rest else [])


def can_work(worker):
    """Si se le puede reservar: trabajador, usuario y turno activos."""
    return bool(
        worker.is_active
        and worker.user is not None
        and worker.user.is_active
        and worker.shift is not None
        and worker.shift.is_active
    )


def worker_unavailable_days(worker, first_day, last_day):
    """Ausencias por días completos, con fechas inclusivas.

    Una ausencia abierta se recorta al rango consultado, no se expande
    indefinidamente. Las ausencias se cargan con Worker.absences.
    """
    unavailable = set()
    for absence in worker.absences:
        first = max(first_day, absence.starts_on)
        last = min(last_day, absence.ends_on or last_day)
        if first <= last:
            unavailable.update(
                first + timedelta(days=offset)
                for offset in range((last - first).days + 1)
            )
    return unavailable


def working_days(worker, first_day, count):
    """Sus `count` próximos días laborables desde first_day (incluido):
    días de su turno que no estén en worker_unavailable_days().
    None si no se encuentran antes de SEARCH_LIMIT_DAYS."""
    last_day = first_day + timedelta(days=SEARCH_LIMIT_DAYS)
    unavailable = worker_unavailable_days(worker, first_day, last_day)
    shift_days = worker.shift.days

    found = []
    day = first_day

    while day <= last_day and len(found) < count:
        if day.isoweekday() in shift_days and day not in unavailable:
            found.append(day)
        day += timedelta(days=1)

    return found if len(found) == count else None


def booking_intervals(worker, start, hours):
    """Los tramos (inicio, fin) de la reserva, o None si no encaja.

    Todos empiezan a la misma hora, y el primero cae el mismo día de
    `start`: si ese día no trabaja, no hay reserva.
    """
    if not can_work(worker):
        return None

    chunks = split_into_days(hours)
    days = working_days(worker, start.date(), len(chunks))

    if days is None or days[0] != start.date():
        return None

    shift = worker.shift
    intervals = []

    for day, chunk in zip(days, chunks):
        begins = datetime.combine(day, start.time())
        ends = begins + timedelta(hours=chunk)

        # Entero dentro del turno de ese día.
        if begins < datetime.combine(day, shift.start_time) or ends > datetime.combine(day, shift.end_time):
            return None

        intervals.append((begins, ends))

    return intervals


def is_free(intervals, busy):
    """Si ningún tramo choca con los ya reservados (`busy`).

    El margen cuenta por los dos lados: entre el fin de una reserva y el
    inicio de otra quedan siempre TRAVEL_MARGIN.
    """
    for begins, ends in intervals:
        for busy_begins, busy_ends in busy:
            if begins < busy_ends + TRAVEL_MARGIN and busy_begins < ends + TRAVEL_MARGIN:
                return False

    return True


# ----------------------------------------------------------------------
# 3. JUNTAR LAS PIEZAS
# ----------------------------------------------------------------------

def load_busy(workers, first_day, last_day, exclude_booking_id=None):
    """Tramos ya reservados del periodo: {worker_id: [(inicio, fin), ...]}.

    UNA consulta para todos los trabajadores (una por franja serían
    cientos). Las canceladas no cuentan: su hueco vuelve a estar libre.
    """
    worker_ids = [worker.worker_id for worker in workers]
    busy = defaultdict(list)

    if not worker_ids:
        return busy

    # Ventana ampliada con el margen: un tramo que acaba justo antes del
    # periodo aún puede estorbar a uno que empiece a primera hora.
    window_start = datetime.combine(first_day, time.min) - TRAVEL_MARGIN
    window_end = datetime.combine(last_day, time.max) + TRAVEL_MARGIN

    rows = db.session.execute(
        db.select(Booking.worker_id, BookingDay.starts_at, BookingDay.ends_at)
        .join(BookingDay, BookingDay.booking_id == Booking.booking_id)
        .where(
            Booking.worker_id.in_(worker_ids),
            Booking.booking_id != exclude_booking_id if exclude_booking_id is not None else True,
            Booking.status != BookingStatus.CANCELLED,
            BookingDay.starts_at < window_end,
            BookingDay.ends_at > window_start,
        )
    ).all()

    for worker_id, starts_at, ends_at in rows:
        busy[worker_id].append((starts_at, ends_at))

    return busy


def candidate_starts(worker, day):
    """Horas de inicio a probar un día: de media en media hora dentro de
    su turno. booking_intervals() descarta las que no caben."""
    current = datetime.combine(day, worker.shift.start_time)
    shift_end = datetime.combine(day, worker.shift.end_time)

    while current < shift_end:
        yield current
        current += SLOT_STEP


def month_availability(workers, hours, month_first_day, now, busy):
    """Huecos del mes: {día: [{"start": "09:00", "options": [...]}]}.

    Cada opción es un trabajador libre y los días que ocuparía:
    {"worker_id": 3, "days": [lunes, martes]}. "Cualquiera" = pasar a
    todos los trabajadores; uno concreto = pasar solo ese.

    Solo salen los días con hueco dentro de la ventana de reserva. `now`
    llega de fuera para poder probar con cualquier fecha.
    """
    earliest = now + MIN_NOTICE
    latest = now + BOOKING_HORIZON

    # Día 1 del mes siguiente: el mes acaba justo antes.
    next_month = (month_first_day.replace(day=28) +
                  timedelta(days=4)).replace(day=1)

    days = {}
    day = month_first_day

    while day < next_month:
        slots = defaultdict(list)

        for worker in workers:
            if not can_work(worker) or day.isoweekday() not in worker.shift.days:
                continue

            for start in candidate_starts(worker, day):
                if start < earliest or start > latest:
                    continue

                intervals = booking_intervals(worker, start, hours)

                if intervals and is_free(intervals, busy.get(worker.worker_id, [])):
                    slots[start].append({
                        "worker_id": worker.worker_id,
                        "days": [begins.date() for begins, _ in intervals],
                    })

        if slots:
            days[day] = [
                {"start": start.strftime("%H:%M"), "options": slots[start]}
                for start in sorted(slots)
            ]

        day += timedelta(days=1)

    return days


def booked_hours_on(busy_intervals, day):
    """Horas que un trabajador ya tiene reservadas un día."""
    total = timedelta()
    for begins, ends in busy_intervals:
        if begins.date() == day:
            total += ends - begins
    return total


def pick_worker(candidates, busy, day):
    """Para "Cualquiera": el que menos horas tenga ese día, para repartir
    el trabajo. Si empatan, el de id más bajo (nunca al azar)."""
    return min(
        candidates,
        key=lambda worker: (booked_hours_on(
            busy.get(worker.worker_id, []), day), worker.worker_id),
    )
