"""
ENDPOINTS DE LA API DE CLEANFLOW. Todo cuelga de /api (prefijo puesto en app.py).

  Públicas:     /register, /login y el catálogo (GET /services, /services/<slug>, /tasks)
  Con sesión:   @jwt_required()         -> token válido, cualquier rol
  Con permiso:  @role_required("...")   -> token + rol correcto (403 si no)

@role_required ya comprueba el token: no se le añade @jwt_required() encima.
"""

import re
import math
import cloudinary
import cloudinary.uploader
from flask import Flask, request, jsonify, url_for, Blueprint, current_app
from api.models import db, User, Task, Service, Worker, Address, Shift, Review, Booking, BookingDay, BookingTask, BookingStatus, Incident, IncidentType, IncidentSource, Media, MediaKind, MediaType, BookingTaskStatus, JobApplication, ContactMessage, ApplicationStatus
from api.utils import generate_sitemap, APIException, role_required, slugify
from api.availability import booking_intervals, can_work, load_busy, madrid_now, month_availability, pick_worker, BOOKING_HORIZON, MADRID, MIN_NOTICE, SEARCH_LIMIT_DAYS
from flask_cors import CORS
from datetime import datetime, timedelta
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from flask_bcrypt import generate_password_hash
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import selectinload
from functools import wraps


api = Blueprint("api", __name__)

# El frontend (puerto 3000) y la API (3001) son orígenes distintos: sin
# CORS el navegador bloquearía las respuestas.
CORS(api)

# ----------------------------------------------------------------------
# AYUDANTES COMUNES
# ----------------------------------------------------------------------


def booking_transaction(fn):
    """Revierte errores y libera bloqueos al terminar cada operación."""
    @wraps(fn)
    def wrapped(*args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except APIException:
            db.session.rollback()
            raise
        except SQLAlchemyError:
            db.session.rollback()
            current_app.logger.exception("Error al actualizar una reserva")
            return jsonify({
                "message": "No se ha podido guardar la operación."
            }), 500
        finally:
            # También libera los bloqueos en respuestas 403, 404 o 409.
            # Los cambios correctos ya se han guardado mediante commit.
            db.session.rollback()

    return wrapped


def get_json_body():
    """Devuelve el cuerpo si es un objeto JSON, o None.

    silent=True evita la excepción con cuerpo vacío o no JSON; [] o "texto"
    tampoco valen porque luego se usa .get().
    """
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else None


EMAIL_PATTERN = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


def is_valid_email(email):
    if not isinstance(email, str):
        return False

    return bool(re.fullmatch(EMAIL_PATTERN, email.strip()))


def clean_optional_text(value, field_label, max_length=None):
    """Texto opcional: devuelve (texto o None, None) o (None, mensaje)."""
    if value is None:
        return None, None

    if not isinstance(value, str):
        return None, f"{field_label} debe ser un texto"

    value = value.strip()

    if max_length and len(value) > max_length:
        return None, f"{field_label} no puede superar los {max_length} caracteres"

    return value or None, None


@api.route("/hello", methods=["POST", "GET"])
def handle_hello():

    response_body = {
        "message": "Hello! I'm a message that came from the backend, check the network tab on the google inspector and you will see the GET request"
    }

    return jsonify(response_body), 200


# ----------------------------------------------------------------------
# TURNOS
# ----------------------------------------------------------------------
#   GET    /api/shifts               listar, cada uno con sus trabajadores
#   POST   /api/shifts               crear
#   PUT    /api/shifts/<id>          editar
#   PATCH  /api/shifts/<id>/status   activar o desactivar
#   DELETE /api/shifts/<id>          borrar, solo si no tiene trabajadores
#
# Lo normal es desactivar: el turno se conserva, pero sin huecos.
# Borrar es seguro sin trabajadores: ninguna reserva apunta a un turno.

# Lunes = 1 ... domingo = 7, como Shift.days.
WEEKDAY_NUMBERS = range(1, 8)


def validate_shift(data):
    """Valida un turno. Devuelve (campos, None) o (None, mensaje).

    Los días son opcionales: si no vienen, al crear se usa lunes a viernes
    y al editar se conservan los que tenía.
    """
    name = data.get("name")

    if not isinstance(name, str) or not name.strip():
        return None, "El nombre del turno es obligatorio"

    name = name.strip()

    if len(name) > 50:
        return None, "El nombre no puede superar los 50 caracteres"

    try:
        start_time = datetime.strptime(data.get("start_time"), "%H:%M").time()
        end_time = datetime.strptime(data.get("end_time"), "%H:%M").time()
    except (ValueError, TypeError):
        return None, "Las horas deben tener el formato HH:MM"

    if start_time >= end_time:
        return None, "La hora de fin debe ser posterior a la de inicio"

    fields = {"name": name, "start_time": start_time, "end_time": end_time}

    # ---- días de la semana ----
    if "work_days" in data:
        days = data["work_days"]

        if not isinstance(days, list) or not days:
            return None, "Elige al menos un día de la semana"

        # bool cuenta como int en Python: sin excluirlo, `true` pasaría por un 1.
        if not all(isinstance(day, int) and not isinstance(day, bool) and day in WEEKDAY_NUMBERS for day in days):
            return None, "Los días van del 1 (lunes) al 7 (domingo)"

        # "days" y no "work_days": pasa por la propiedad de Shift, que lo
        # guarda ordenado y sin repetidos.
        fields["days"] = days

    return fields, None


@api.route("/shifts", methods=["GET"])
@role_required("manager")
def get_shifts():
    """Todos los turnos, del que empieza antes al que empieza después."""
    shifts = db.session.execute(
        db.select(Shift).order_by(Shift.start_time)
    ).scalars().all()

    return jsonify({"shifts": [shift.serialize() for shift in shifts]}), 200


@api.route("/shifts", methods=["POST"])
@role_required("manager")
def create_shift():
    data = get_json_body()

    if data is None:
        return jsonify({"message": "No se recibieron datos"}), 400

    fields, error = validate_shift(data)
    if error:
        return jsonify({"message": error}), 400

    shift = Shift()
    for field, value in fields.items():
        setattr(shift, field, value)

    try:
        db.session.add(shift)
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({"message": "No se ha podido crear el turno"}), 500

    return jsonify({"shift": shift.serialize()}), 201


@api.route("/shifts/<int:shift_id>", methods=["PUT"])
@role_required("manager")
def update_shift(shift_id):
    shift = db.session.get(Shift, shift_id)

    if not shift:
        return jsonify({"message": "Turno no encontrado"}), 404

    data = get_json_body()

    if data is None:
        return jsonify({"message": "No se recibieron datos"}), 400

    fields, error = validate_shift(data)
    if error:
        return jsonify({"message": error}), 400

    for field, value in fields.items():
        setattr(shift, field, value)

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({"message": "No se ha podido actualizar el turno"}), 500

    return jsonify({"shift": shift.serialize()}), 200


@api.route("/shifts/<int:shift_id>/status", methods=["PATCH"])
@role_required("manager")
def update_shift_status(shift_id):
    """Activa o desactiva un turno. Desactivado, sus trabajadores lo
    conservan, pero no ofrece huecos."""
    shift = db.session.get(Shift, shift_id)

    if not shift:
        return jsonify({"message": "Turno no encontrado"}), 404

    data = get_json_body()

    if data is None or not isinstance(data.get("is_active"), bool):
        return jsonify({"message": "Envía is_active con true o false"}), 400

    shift.is_active = data["is_active"]
    db.session.commit()

    return jsonify({"shift": shift.serialize()}), 200


@api.route("/shifts/<int:shift_id>", methods=["DELETE"])
@role_required("manager")
def delete_shift(shift_id):
    shift = db.session.get(Shift, shift_id)

    if not shift:
        return jsonify({"message": "Turno no encontrado"}), 404

    assigned_worker = db.session.execute(
        db.select(Worker).filter_by(shift_id=shift_id)
    ).scalars().first()

    if assigned_worker:
        return jsonify({"message": "No puedes eliminar un turno con trabajadores asignados"}), 409

    try:
        db.session.delete(shift)
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({"message": "No se ha podido eliminar el turno"}), 500

    return jsonify({"message": "Turno eliminado correctamente"}), 200


# ----------------------------------------------------------------------
# WORKERS
# ----------------------------------------------------------------------
#   POST   /api/workers        crear usuario + worker
#   GET    /api/workers        listar
#   GET    /api/workers/<id>   ver uno
#   PUT    /api/workers/<id>   editar


@api.route("/workers", methods=["POST"])
@role_required("manager")
def create_worker():
    data = request.get_json()

    if not data:
        return jsonify({
            "message": "No se han enviado datos"
        }), 400

    name = data.get("name")
    last_name = data.get("last_name")
    phone = data.get("phone")
    email = data.get("email")
    password = data.get("password")
    role = data.get("role", "worker")
    shift_id = data.get("shift_id")
    hire_date = data.get("hire_date")
    position = data.get("position")

    if not name or not last_name or not phone or not email or not password:
        return jsonify({
            "message": "Nombre, apellidos, teléfono, email y contraseña son obligatorios"
        }), 400

    # Validar email
    email_pattern = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"

    if not re.match(email_pattern, email):
        return jsonify({
            "message": "El correo electrónico no es válido"
        }), 400

    # Validar contraseña
    if len(password) < 6:
        return jsonify({
            "message": "La contraseña debe tener mínimo 6 caracteres"
        }), 400

    # Solo se pueden crear trabajadores o managers
    if role not in ["worker", "manager"]:
        return jsonify({
            "message": "El rol debe ser worker o manager"
        }), 400

    # Comprobar email duplicado
    existing_user = User.query.filter_by(email=email).first()

    if existing_user:
        return jsonify({
            "message": "El correo electrónico ya está registrado"
        }), 409

    # Validar fecha solo si se ha enviado
    parsed_hire_date = None

    if hire_date:
        try:
            parsed_hire_date = datetime.strptime(
                hire_date,
                "%Y-%m-%d"
            ).date()

        except (ValueError, TypeError):
            return jsonify({
                "message": "hire_date debe tener el formato YYYY-MM-DD"
            }), 400

    try:
        user = User(
            name=name,
            last_name=last_name,
            phone=phone,
            email=email,
            role=role,
            is_active=True
        )

        user.set_password(password)

        db.session.add(user)
        db.session.flush()

        worker = Worker(
            user_id=user.user_id,
            shift_id=shift_id,
            hire_date=parsed_hire_date,
            position=position,
            is_active=True
        )

        db.session.add(worker)
        db.session.commit()

        return jsonify(worker.serialize()), 201

    except Exception:
        db.session.rollback()

        return jsonify({
            "message": "No se ha podido crear el trabajador"
        }), 500


@api.route("/workers", methods=["GET"])
@role_required("manager")
def get_workers():
    """Todos los trabajadores y encargados, por nombre.

    Además de sus datos: la foto, el horario del turno, la valoración media
    de sus reservas y si tiene una ausencia hoy ("Baja en curso").
    """
    workers = db.session.execute(
        db.select(Worker)
        .join(User, Worker.user_id == User.user_id)
        .options(
            selectinload(Worker.user),
            selectinload(Worker.shift),
            selectinload(Worker.absences),
        )
        .order_by(User.name, User.last_name)
    ).scalars().all()

    # La valoración de cada trabajador es la media de las reseñas de sus
    # reservas. UNA consulta agrupada para todos, no una por trabajador.
    ratings = {
        worker_id: (average, total)
        for worker_id, average, total in db.session.execute(
            db.select(Booking.worker_id, func.avg(Review.rating), func.count(Review.review_id))
            .join(Review, Review.booking_id == Booking.booking_id)
            .group_by(Booking.worker_id)
        ).all()
    }

    today = madrid_now().date()

    def list_item(worker):
        average, total = ratings.get(worker.worker_id, (None, 0))
        shift = worker.shift

        return {
            **worker.serialize(),
            "avatar_url": worker.user.avatar_url if worker.user else None,
            "shift_start": shift.start_time.strftime("%H:%M") if shift else None,
            "shift_end": shift.end_time.strftime("%H:%M") if shift else None,
            "rating": round(float(average), 1) if average is not None else None,
            "reviews_count": total,
            # Una ausencia que incluye hoy. Sin fecha de fin, sigue abierta.
            "on_leave_today": any(
                absence.starts_on <= today and (absence.ends_on is None or absence.ends_on >= today)
                for absence in worker.absences
            ),
        }

    return jsonify({"workers": [list_item(worker) for worker in workers]}), 200


@api.route("/workers/<int:worker_id>", methods=["GET"])
@role_required("manager")
def get_worker(worker_id):
    worker = db.session.get(Worker, worker_id)

    if not worker:
        return jsonify({
            "message": "Worker no encontrado"
        }), 404

    return jsonify({
        "worker_id": worker.worker_id,
        "user_id": worker.user_id,
        "name": worker.user.name if worker.user else None,
        "last_name": worker.user.last_name if worker.user else None,
        "phone": worker.user.phone if worker.user else None,
        "email": worker.user.email if worker.user else None,
        "role": worker.user.role if worker.user else None,
        "shift_id": worker.shift_id,
        "shift_name": worker.shift.name if worker.shift else None,
        "hire_date": (
            worker.hire_date.isoformat()
            if worker.hire_date
            else None
        ),
        "position": worker.position,
        "is_active": worker.is_active
    }), 200


@api.route("/workers/<int:worker_id>", methods=["PUT"])
@role_required("manager")
def update_worker(worker_id):
    worker = db.session.get(Worker, worker_id)

    if not worker:
        return jsonify({
            "message": "Worker no encontrado"
        }), 404

    data = request.get_json()

    if not data:
        return jsonify({
            "message": "No se han enviado datos"
        }), 400

    # --------------------------------------------------------------
    # DATOS DEL USUARIO
    # --------------------------------------------------------------

    if "name" in data:
        worker.user.name = data["name"]

    if "last_name" in data:
        worker.user.last_name = data["last_name"]

    if "phone" in data:
        worker.user.phone = data["phone"]

    if "email" in data:
        email = data["email"]

        email_pattern = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"

        if not re.match(email_pattern, email):
            return jsonify({
                "message": "El correo electrónico no es válido"
            }), 400

        existing_user = User.query.filter_by(
            email=email
        ).first()

        # Evitamos que un trabajador cambie su email
        # por el de otro usuario.
        if (
            existing_user
            and existing_user.user_id != worker.user_id
        ):
            return jsonify({
                "message": "El email ya está registrado"
            }), 409

        worker.user.email = email

    # --------------------------------------------------------------
    # DATOS DEL WORKER
    # --------------------------------------------------------------

    if "shift_id" in data:
        worker.shift_id = data["shift_id"]

    if "hire_date" in data:
        if data["hire_date"] in [None, ""]:
            worker.hire_date = None

        else:
            try:
                worker.hire_date = datetime.strptime(
                    data["hire_date"],
                    "%Y-%m-%d"
                ).date()

            except (ValueError, TypeError):
                return jsonify({
                    "message": "hire_date debe tener el formato YYYY-MM-DD"
                }), 400

    if "position" in data:
        worker.position = data["position"]

    # --------------------------------------------------------------
    # ESTADO
    # --------------------------------------------------------------

    if "is_active" in data:
        worker.is_active = data["is_active"]

        # También actualizamos el estado del User
        worker.user.is_active = data["is_active"]

    # --------------------------------------------------------------
    # ROL
    # --------------------------------------------------------------

    if "role" in data:
        if data["role"] not in ["worker", "manager"]:
            return jsonify({
                "message": "El rol debe ser worker o manager"
            }), 400

        current_user_id = get_jwt_identity()

        # Un manager no puede quitarse a sí mismo
        # el rol de manager.
        if (
            str(worker.user_id) == str(current_user_id)
            and data["role"] != "manager"
        ):
            return jsonify({
                "message": "No puedes quitarte el rol de manager"
            }), 403

        worker.user.role = data["role"]

    # --------------------------------------------------------------
    # GUARDAR CAMBIOS
    # --------------------------------------------------------------

    try:
        db.session.commit()

        return jsonify({
            "message": "Worker actualizado correctamente",
            "worker_id": worker.worker_id,
            "user_id": worker.user_id,
            "name": worker.user.name,
            "last_name": worker.user.last_name,
            "phone": worker.user.phone,
            "email": worker.user.email,
            "shift_id": worker.shift_id,
            "shift_name": worker.shift.name if worker.shift else None,
            "hire_date": (
                worker.hire_date.isoformat()
                if worker.hire_date
                else None
            ),
            "position": worker.position,
            "role": worker.user.role,
            "is_active": worker.is_active
        }), 200

    except Exception:
        db.session.rollback()

        return jsonify({
            "message": "Error al actualizar el worker"
        }), 500


@api.route("/workers/<int:worker_id>/status", methods=["PATCH"])
@role_required("manager")
def update_worker_status(worker_id):
    """Activa o desactiva a un trabajador: el trabajador y su usuario a la vez.

    Desactivado no aparece libre para reservar, no puede entrar, y sus
    reservas pendientes pasan solas a Reservas afectadas (#15).
    """
    data = get_json_body()

    if data is None or not isinstance(data.get("is_active"), bool):
        return jsonify({"message": "Indica el estado: is_active tiene que ser true o false"}), 400

    worker = db.session.get(Worker, worker_id)

    if worker is None:
        return jsonify({"message": "Trabajador no encontrado"}), 404

    # Nadie puede desactivarse a sí mismo: se quedaría fuera de la aplicación.
    if worker.user_id == current_user().user_id and not data["is_active"]:
        return jsonify({"message": "No puedes desactivar tu propia cuenta"}), 403

    worker.is_active = data["is_active"]

    if worker.user:
        worker.user.is_active = data["is_active"]

    db.session.commit()

    return jsonify({"worker": worker.serialize()}), 200


# ----------------------------------------------------------------------
# RUTAS PÚBLICAS
# ----------------------------------------------------------------------
#   POST   /api/register   alta de cliente
#   POST   /api/login      devuelve token + usuario

@api.route('/register', methods=['POST'])
def register():
    """Da de alta un usuario nuevo (siempre como client).

    Todo se valida ANTES de tocar la BD, y cada fallo tiene su código HTTP.
    """
    data = request.get_json()

    if not data:
        return jsonify({"message": "No se recibieron datos"}), 400

    name = data.get("name")
    last_name = data.get("last_name")
    phone = data.get("phone")
    email = data.get("email")
    password = data.get("password")

    # .get() da None si la clave no viene: cubre ausentes y vacíos a la vez.
    if not name or not last_name or not phone or not email or not password:
        return jsonify({"message": "Todos los campos son obligatorios"}), 400

    # Solo la forma "algo@algo.algo"; no comprueba que el correo exista.
    email_pattern = r'^[^@\s]+@[^@\s]+\.[^@\s]+$'

    if not re.match(email_pattern, email):
        return jsonify({"message": "El correo electrónico no es válido"}), 400

    existing_user = db.session.execute(
        db.select(User).where(User.email == email)
    ).scalar_one_or_none()

    # 409 y no 400: los datos son correctos, pero chocan con algo que ya existe.
    if existing_user:
        return jsonify({"message": "El correo electrónico ya está registrado"}), 409

    if len(password) < 6:
        return jsonify({"message": "La contraseña debe tener mínimo 6 caracteres"}), 400

    # Rol forzado a "client": workers y managers solo los crea el manager
    # desde el dashboard, nunca un alta desde fuera.
    new_user = User(
        name=name,
        last_name=last_name,
        phone=phone,
        email=email,
        role="client",
        is_active=True
    )
    # set_password hashea; nunca se asigna password_hash a mano.
    new_user.set_password(password)

    db.session.add(new_user)
    db.session.commit()

    return jsonify({
        "message": "Usuario registrado correctamente",
        "user": new_user.serialize()
    }), 201


@api.route('/login', methods=['POST'])
def login():
    """Comprueba credenciales y devuelve token + usuario.

    El usuario va incluido para que el frontend sepa el rol sin otra petición.
    """
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    existing_user = db.session.execute(db.select(User).where(
        User.email == email)).scalar_one_or_none()

    # Mismo mensaje si falla el email o la contraseña: así nadie puede
    # averiguar qué correos están registrados.
    if existing_user is None:
        return jsonify({"error": "Invalid email or password"}), 401

    if existing_user.check_password(password):
        if not existing_user.is_active:
            return jsonify({"error": "Your account is deactivated. Contact the administrator."}), 403
        # El token guarda el user_id como texto (lo que espera la librería).
        # Caduca solo: no hay que guardarlo en ningún sitio.
        access_token = create_access_token(identity=str(existing_user.user_id))
        return jsonify({
            "msg": "Logged succefully",
            "token": access_token,
            "user": existing_user.serialize_session()
        }), 200
    else:
        return jsonify({"error": "Invalid email or password"}), 401


# ----------------------------------------------------------------------
# CATÁLOGO PÚBLICO (WEB Y CLIENTE)
# ----------------------------------------------------------------------
#   GET    /api/services          servicios activos
#   GET    /api/services/<slug>   un servicio activo, con su ficha
#   GET    /api/tasks             tareas activas
#
# Sin decorador: lo ve cualquiera, con sesión o sin ella. Por eso solo
# devuelve lo activo y con serialize_public(), nunca el estado.

@api.route("/services", methods=["GET"])
def get_services():
    """Servicios activos, para la web pública y el panel del cliente.

    El listado completo es otra ruta (/manage/services): así no decide
    quien llama si ve también los desactivados.
    """
    services = db.session.execute(
        db.select(Service).filter_by(
            is_active=True).order_by(Service.service_id)
    ).scalars().all()

    return jsonify({"services": [service.serialize_public() for service in services]}), 200


@api.route("/services/<slug>", methods=["GET"])
def get_service(slug):
    """Un servicio activo por su slug, con descripción larga e imagen.

    Desactivado da el mismo 404 que si no existiera: un servicio retirado
    no sigue accesible escribiendo su URL.
    """
    service = db.session.execute(
        db.select(Service).filter_by(slug=slug, is_active=True)
    ).scalar_one_or_none()

    if not service:
        return jsonify({"message": "Servicio no encontrado"}), 404

    return jsonify({"service": service.serialize_public()}), 200


@api.route("/tasks", methods=["GET"])
def get_tasks():
    """Tareas activas: el catálogo compartido que ve el cliente.

    Sin minutos: dependen del servicio (Service.minutes_per_task).
    """
    now = madrid_now()

    last_service_day = max(
        (day.starts_at.date() for day in booking.days),
        default=booking.scheduled_start.date(),
    )

    if last_service_day > now.date():
        return jsonify({
            "message": "No puedes completar la reserva antes de su último día de servicio."
        }), 409
    tasks = db.session.execute(
        db.select(Task).filter_by(is_active=True).order_by(Task.task_id)
    ).scalars().all()

    return jsonify({"tasks": [task.serialize_public() for task in tasks]}), 200


# ----------------------------------------------------------------------
# RUTAS CON SESIÓN
# ----------------------------------------------------------------------
#   GET    /api/profile    usuario del token (cualquier rol)
#   GET    /api/account           datos de la pantalla de ajustes
#   PUT    /api/account           editar nombre, apellidos y teléfono
#   PUT    /api/account/password  cambiar la contraseña
#   POST   /api/account/avatar    subir la foto de perfil
#   DELETE /api/account/avatar    quitarla

@api.route("/profile", methods=["GET"])
@jwt_required()
def get_profile():
    """Devuelve el usuario del token. El frontend lo usa al cargar para
    revalidar la sesión: si responde 401, el token ya no vale.
    """
    # El id sale del token, no de la URL: nadie puede pedir el perfil de otro.
    user_id = get_jwt_identity()
    user = db.session.get(User, user_id)

    # Token válido, pero el usuario se borró con la sesión abierta.
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Misma forma que /login ({"user": ...}): el frontend lee siempre data.user.
    return jsonify({"user": user.serialize_session()}), 200


# ---------- MI CUENTA ----------
# La pantalla de ajustes (#13). Cualquier rol entra: lo que cambia es qué
# puede editar cada uno.

# Mismos topes que las columnas de User en models.py.
ACCOUNT_NAME_MAX_LENGTH = 100
ACCOUNT_LAST_NAME_MAX_LENGTH = 150

# El mismo mínimo que pide /register: una sola regla en toda la aplicación.
PASSWORD_MIN_LENGTH = 6

# Fotos. Los mismos tipos en todas partes; el tamaño cambia según para qué:
# un avatar se ve pequeño, y la prueba de una tarea o de una incidencia
# tiene que dejar ver el detalle.
IMAGE_ALLOWED_TYPES = ("image/jpeg", "image/png", "image/webp")
AVATAR_MAX_BYTES = 2 * 1024 * 1024
PHOTO_MAX_BYTES = 5 * 1024 * 1024
AVATAR_FOLDER = "cleanflow/avatars"
# Estas dos aún no las usa nadie: las estrenan las fotos de tarea (#82)
# y las de incidencia (#18), que ya solo tienen que llamar a upload_image().
BOOKING_FOLDER = "cleanflow/bookings"
INCIDENT_FOLDER = "cleanflow/incidents"

# Números, espacios y un + inicial. Entre 9 y 15 dígitos: 9 son los de un
# teléfono español y 15 el máximo internacional.
PHONE_ALLOWED_PATTERN = r"^\+?[0-9 ]+$"
PHONE_MIN_DIGITS = 9
PHONE_MAX_DIGITS = 15


def current_user():
    """El usuario del token. None si la cuenta ya no existe."""
    return db.session.get(User, get_jwt_identity())


def clean_account_text(value, current, max_length, required_message, length_message):
    """Texto obligatorio de la cuenta: (texto, None) o (None, mensaje).

    Los mensajes llegan escritos desde fuera: "el nombre" y "los apellidos"
    no concuerdan igual en español.
    Si el campo no viene en el cuerpo, se conserva el que ya tenía.
    """
    if value is None:
        return current, None

    if not isinstance(value, str) or not value.strip():
        return None, required_message

    value = value.strip()

    if len(value) > max_length:
        return None, length_message

    return value, None


def clean_phone(value, current):
    """Teléfono: (teléfono, None) o (None, mensaje)."""
    if value is None:
        return current, None

    if not isinstance(value, str) or not value.strip():
        return None, "El teléfono es obligatorio"

    phone = value.strip()
    digits = sum(1 for character in phone if character.isdigit())

    if not re.match(PHONE_ALLOWED_PATTERN, phone) or not PHONE_MIN_DIGITS <= digits <= PHONE_MAX_DIGITS:
        return None, (
            f"El teléfono tiene que tener entre {PHONE_MIN_DIGITS} y {PHONE_MAX_DIGITS} dígitos. "
            "Solo se admiten números, espacios y el signo + al principio"
        )

    return phone, None


@api.route("/account", methods=["GET"])
@jwt_required()
def get_account():
    """Datos del usuario del token para la pantalla de ajustes.

    serialize_account() y no serialize_session(): aquí sí viaja el teléfono.
    """
    user = current_user()

    if not user:
        return jsonify({"message": "Usuario no encontrado"}), 404

    return jsonify({"account": user.serialize_account()}), 200


@api.route("/account", methods=["PUT"])
@jwt_required()
def update_account():
    """Edita nombre, apellidos y teléfono del usuario del token.

    El correo y el rol NO se tocan aquí, aunque vengan en el cuerpo: el
    correo es la identidad de la cuenta y el rol lo decide el encargado.
    """
    user = current_user()

    if not user:
        return jsonify({"message": "Usuario no encontrado"}), 404

    # El trabajador solo cambia su foto y su contraseña: sus datos los
    # gestiona el encargado desde Trabajadores.
    if user.role == "worker":
        return jsonify({
            "message": "Tus datos los gestiona tu encargado. Puedes cambiar tu foto y tu contraseña"
        }), 403

    data = get_json_body()

    if data is None:
        return jsonify({"message": "No se recibieron datos"}), 400

    # Se valida todo antes de escribir: si algo falla, la BD no se entera.
    name, error = clean_account_text(
        data.get("name"), user.name, ACCOUNT_NAME_MAX_LENGTH,
        "El nombre es obligatorio",
        f"El nombre no puede superar los {ACCOUNT_NAME_MAX_LENGTH} caracteres",
    )
    if error:
        return jsonify({"message": error}), 400

    last_name, error = clean_account_text(
        data.get("last_name"), user.last_name, ACCOUNT_LAST_NAME_MAX_LENGTH,
        "Los apellidos son obligatorios",
        f"Los apellidos no pueden superar los {ACCOUNT_LAST_NAME_MAX_LENGTH} caracteres",
    )
    if error:
        return jsonify({"message": error}), 400

    phone, error = clean_phone(data.get("phone"), user.phone)
    if error:
        return jsonify({"message": error}), 400

    user.name = name
    user.last_name = last_name
    user.phone = phone

    db.session.commit()

    # account rellena el formulario; user va al store, y con él se actualiza
    # el bloque del sidebar sin recargar.
    return jsonify({
        "account": user.serialize_account(),
        "user": user.serialize_session()
    }), 200


@api.route("/account/password", methods=["PUT"])
@jwt_required()
def update_account_password():
    """Cambia la contraseña del usuario del token. Cualquier rol.

    Pide la actual: con una sesión abierta en un ordenador ajeno, nadie
    puede cambiarla sin saberla.
    """
    user = current_user()

    if not user:
        return jsonify({"message": "Usuario no encontrado"}), 404

    data = get_json_body()

    if data is None:
        return jsonify({"message": "No se recibieron datos"}), 400

    current_password = data.get("current_password")
    new_password = data.get("new_password")

    if not isinstance(current_password, str) or not isinstance(new_password, str) or not current_password or not new_password:
        return jsonify({"message": "La contraseña actual y la nueva son obligatorias"}), 400

    # Se comprueba la actual ANTES que nada: a quien no la sepa no se le
    # cuentan las reglas de la nueva.
    # ⚠️ 400 y NUNCA 401: el frontend cierra la sesión al recibir un 401, y
    # equivocarse escribiendo no es tener la sesión caducada.
    if not user.check_password(current_password):
        return jsonify({"message": "La contraseña actual no es correcta"}), 400

    if len(new_password) < PASSWORD_MIN_LENGTH:
        return jsonify({"message": f"La contraseña nueva debe tener mínimo {PASSWORD_MIN_LENGTH} caracteres"}), 400

    if new_password == current_password:
        return jsonify({"message": "La contraseña nueva tiene que ser distinta de la actual"}), 400

    # set_password hashea; nunca se asigna password_hash a mano.
    user.set_password(new_password)
    db.session.commit()

    # Sin datos del usuario: aquí no cambia nada que el frontend tenga que
    # repintar. El token sigue valiendo, así que la sesión no se corta.
    return jsonify({"message": "Contraseña actualizada correctamente"}), 200


def avatar_public_id(user):
    """Nombre del archivo en Cloudinary: uno fijo por usuario.

    Al subir una foto nueva se sobrescribe la anterior, así no se acumulan
    imágenes sueltas que ya no usa nadie.
    """
    return f"{AVATAR_FOLDER}/user_{user.user_id}"


def cloudinary_is_configured():
    """True si CLOUDINARY_URL está en el .env y el SDK la ha leído."""
    config = cloudinary.config()
    return bool(config.cloud_name and config.api_key and config.api_secret)


def upload_image(photo, folder, *, public_id=None, max_bytes=PHOTO_MAX_BYTES,
                 transformation=None):
    """Sube una imagen a Cloudinary y devuelve (url, error).

    Uno de los dos siempre es None:
      ("https://...", None)  -> subida correcta
      (None, (mensaje, código)) -> algo falló, listo para jsonify

    Se devuelve el error en vez de lanzarlo para que cada endpoint decida
    qué contar al usuario, sin repetir aquí las comprobaciones.

    photo: el archivo de request.files · folder: carpeta de Cloudinary
    public_id: nombre fijo (sobrescribe el anterior); sin él, uno nuevo
    """
    if photo is None or not photo.filename:
        return None, ("No se ha recibido ninguna foto", 400)

    if photo.mimetype not in IMAGE_ALLOWED_TYPES:
        return None, ("La foto tiene que ser JPG, PNG o WEBP", 400)

    content = photo.read()

    if not content:
        return None, ("El archivo está vacío", 400)

    if len(content) > max_bytes:
        megas = max_bytes // (1024 * 1024)
        return None, (f"La foto no puede pesar más de {megas} MB", 400)

    # Sin claves, el fallo es de configuración y no del usuario: 503 y no
    # 500, que sería "algo se ha roto".
    if not cloudinary_is_configured():
        return None, ("La subida de fotos no está configurada. Falta CLOUDINARY_URL", 503)

    try:
        result = cloudinary.uploader.upload(
            content,
            folder=None if public_id else folder,
            public_id=public_id,
            overwrite=bool(public_id),
            # invalidate: borra la copia en caché de la imagen anterior.
            invalidate=True,
            resource_type="image",
            transformation=transformation,
        )
    except Exception as error:
        # Cloudinary caído, sin internet o claves mal: no es culpa de quien sube.
        print("Fallo al subir la foto a Cloudinary:", error)
        return None, ("No se ha podido subir la foto. Inténtalo de nuevo", 502)

    # secure_url: la https y con número de versión, así el navegador no
    # sigue enseñando la imagen anterior de su caché.
    return result.get("secure_url"), None


@api.route("/account/avatar", methods=["POST"])
@jwt_required()
def upload_account_avatar():
    """Sube la foto de perfil del usuario del token. Cualquier rol.

    Llega como archivo (multipart/form-data) en el campo `avatar`, no como
    JSON: por eso aquí se usa request.files y no get_json_body().
    """
    user = current_user()

    if not user:
        return jsonify({"message": "Usuario no encontrado"}), 404

    # content_length es el tamaño de TODA la petición. Se mira antes de leer
    # nada: así un archivo enorme no se carga en memoria solo para caducar.
    # El margen cubre las cabeceras del multipart.
    if request.content_length and request.content_length > AVATAR_MAX_BYTES + 8192:
        return jsonify({"message": "La foto no puede pesar más de 2 MB"}), 400

    url, error = upload_image(
        request.files.get("avatar"),
        AVATAR_FOLDER,
        # Nombre fijo por usuario: la foto nueva sobrescribe la anterior y
        # no se acumulan imágenes sueltas que ya no usa nadie.
        public_id=avatar_public_id(user),
        max_bytes=AVATAR_MAX_BYTES,
        # Cuadrada y centrada en la cara, que es lo que se ve en el avatar.
        transformation=[{"width": 256, "height": 256,
                         "crop": "fill", "gravity": "face"}],
    )

    if error:
        message, status = error
        return jsonify({"message": message}), status

    user.avatar_url = url
    db.session.commit()

    return jsonify({
        "account": user.serialize_account(),
        "user": user.serialize_session()
    }), 200


@api.route("/account/avatar", methods=["DELETE"])
@jwt_required()
def delete_account_avatar():
    """Quita la foto de perfil: vuelven a verse las iniciales."""
    user = current_user()

    if not user:
        return jsonify({"message": "Usuario no encontrado"}), 404

    if user.avatar_url and cloudinary_is_configured():
        try:
            cloudinary.uploader.destroy(
                avatar_public_id(user), invalidate=True)
        except Exception as error:
            # Si Cloudinary falla, la imagen se queda allí, pero el usuario
            # deja de verla igual: no se le bloquea por eso.
            print("Fallo al borrar la foto en Cloudinary:", error)

    user.avatar_url = None
    db.session.commit()

    return jsonify({
        "account": user.serialize_account(),
        "user": user.serialize_session()
    }), 200


# ----------------------------------------------------------------------
# DIRECCIONES DEL CLIENTE
# ----------------------------------------------------------------------
#   GET    /api/addresses                activas, la principal primero
#   POST   /api/addresses                crear
#   PUT    /api/addresses/<id>           editar
#   PATCH  /api/addresses/<id>/default   marcar como principal
#   DELETE /api/addresses/<id>           desactivar
#
# Solo el rol client: el encargado y el trabajador no contratan servicios.
# Cada cliente ve y toca SOLO las suyas; la de otro responde 404 y no 403,
# para no confirmar que ese id existe.

# Mismos topes que las columnas de Address en models.py.
STREET_MAX_LENGTH = 150
NUMBER_MAX_LENGTH = 20
FLOOR_MAX_LENGTH = 20
CITY_MAX_LENGTH = 80

# Código postal español: cinco números.
POSTAL_CODE_PATTERN = r"^[0-9]{5}$"


def owned_address(user, address_id):
    """La dirección activa del cliente, o None si no es suya o ya no está."""
    return db.session.execute(
        db.select(Address).filter_by(address_id=address_id,
                                     client_id=user.user_id, is_active=True)
    ).scalar_one_or_none()


def active_addresses(user):
    """Las direcciones activas del cliente: la principal primero y, después,
    de la más reciente a la más antigua."""
    return db.session.execute(
        db.select(Address)
        .filter_by(client_id=user.user_id, is_active=True)
        .order_by(Address.is_default.desc(), Address.created_at.desc())
    ).scalars().all()


def validate_address(data, current=None):
    """Valida una dirección. Devuelve (campos, None) o (None, mensaje).

    Al editar se pasa current: lo que no venga en el cuerpo se conserva.
    """

    def pick(field):
        if field in data:
            return data[field]
        return getattr(current, field) if current is not None else None

    fields = {}

    # ---- obligatorios ----
    # Cada uno con su mensaje escrito: "la calle es obligatoria" y "el
    # número es obligatorio" no concuerdan igual.
    for field, label, max_length, required_message in (
        ("street", "La calle", STREET_MAX_LENGTH, "La calle es obligatoria"),
        ("number", "El número", NUMBER_MAX_LENGTH, "El número es obligatorio"),
        ("city", "La ciudad", CITY_MAX_LENGTH, "La ciudad es obligatoria"),
    ):
        value = pick(field)

        if not isinstance(value, str) or not value.strip():
            return None, required_message

        value = value.strip()

        if len(value) > max_length:
            return None, f"{label} no puede superar los {max_length} caracteres"

        fields[field] = value

    # ---- código postal ----
    postal_code = pick("postal_code")

    if not isinstance(postal_code, str) or not re.match(POSTAL_CODE_PATTERN, postal_code.strip()):
        return None, "El código postal tiene que ser cinco números"

    fields["postal_code"] = postal_code.strip()

    # ---- opcionales: vacíos se guardan como NULL ----
    fields["floor"], error = clean_optional_text(
        pick("floor"), "El piso", FLOOR_MAX_LENGTH)
    if error:
        return None, error

    fields["access_notes"], error = clean_optional_text(
        pick("access_notes"), "Las notas de acceso")
    if error:
        return None, error

    return fields, None


@api.route("/addresses", methods=["GET"])
@role_required("client")
def get_addresses():
    """Las direcciones activas del cliente."""
    user = current_user()

    return jsonify({
        "addresses": [address.serialize() for address in active_addresses(user)]
    }), 200


@api.route("/addresses", methods=["POST"])
@role_required("client")
def create_address():
    """Crea una dirección. La primera del cliente nace como principal."""
    user = current_user()

    data = get_json_body()

    if data is None:
        return jsonify({"message": "No se recibieron datos"}), 400

    fields, error = validate_address(data)
    if error:
        return jsonify({"message": error}), 400

    # is_default no se acepta del cuerpo: se marca con PATCH .../default.
    address = Address(client_id=user.user_id,
                      is_default=not active_addresses(user), **fields)

    db.session.add(address)
    db.session.commit()

    return jsonify({"address": address.serialize()}), 201


@api.route("/addresses/<int:address_id>", methods=["PUT"])
@role_required("client")
def update_address(address_id):
    """Edita una dirección del cliente (solo lo que venga en el cuerpo)."""
    user = current_user()
    address = owned_address(user, address_id)

    if not address:
        return jsonify({"message": "Dirección no encontrada"}), 404

    data = get_json_body()

    if data is None:
        return jsonify({"message": "No se recibieron datos"}), 400

    fields, error = validate_address(data, current=address)
    if error:
        return jsonify({"message": error}), 400

    # Validado todo, ahora sí se aplica.
    for field, value in fields.items():
        setattr(address, field, value)

    db.session.commit()

    return jsonify({"address": address.serialize()}), 200


@api.route("/addresses/<int:address_id>/default", methods=["PATCH"])
@role_required("client")
def set_default_address(address_id):
    """Marca una dirección como principal y quita la marca a la anterior.

    Las dos cosas en el MISMO commit: si se hiciera en dos, un fallo entre
    medias dejaría al cliente sin principal o con dos.
    """
    user = current_user()
    address = owned_address(user, address_id)

    if not address:
        return jsonify({"message": "Dirección no encontrada"}), 404

    for other in active_addresses(user):
        other.is_default = other.address_id == address.address_id

    db.session.commit()

    return jsonify({
        "addresses": [item.serialize() for item in active_addresses(user)]
    }), 200


@api.route("/addresses/<int:address_id>", methods=["DELETE"])
@role_required("client")
def delete_address(address_id):
    """Quita una dirección de la lista del cliente.

    No se borra: se desactiva, porque puede haber reservas que apunten a
    ella. Si era la principal, pasa a serlo la más reciente de las que quedan.
    """
    user = current_user()
    address = owned_address(user, address_id)

    if not address:
        return jsonify({"message": "Dirección no encontrada"}), 404

    was_default = address.is_default

    address.is_active = False
    address.is_default = False

    if was_default:
        remaining = active_addresses(user)

        if remaining:
            remaining[0].is_default = True

    db.session.commit()

    return jsonify({
        "addresses": [item.serialize() for item in active_addresses(user)]
    }), 200


# ----------------------------------------------------------------------
# RUTAS CON PERMISO POR ROL: EL PATRÓN
# ----------------------------------------------------------------------
#   @role_required("manager")             -> solo encargados
#   @role_required("manager", "worker")   -> varios roles
#
# Los guardianes del frontend (RoleRoute, sidebar) solo orientan: el rol se
# puede editar en el navegador. Lo que protege los datos es este decorador,
# así que toda ruta del dashboard necesita el suyo.


# ----------------------------------------------------------------------
# CATÁLOGO DE TAREAS (ENCARGADO)
# ----------------------------------------------------------------------
#   GET    /api/manage/tasks          todas, activas y desactivadas
#   POST   /api/tasks                 crear
#   PUT    /api/tasks/<id>            editar nombre y descripción
#   PATCH  /api/tasks/<id>/status     activar o desactivar
#
# No hay DELETE: se desactiva, para no dejar reservas apuntando a la nada.

# Mismo tope que la columna task_name en models.py.
TASK_NAME_MAX_LENGTH = 100


def clean_task_name(raw_name):
    """Devuelve (nombre, None) si vale, o (None, mensaje) si no."""
    if not isinstance(raw_name, str) or not raw_name.strip():
        return None, "El nombre de la tarea es obligatorio"

    name = raw_name.strip()

    if len(name) > TASK_NAME_MAX_LENGTH:
        return None, f"El nombre no puede superar los {TASK_NAME_MAX_LENGTH} caracteres"

    return name, None


def task_name_taken(name, exclude_task_id=None):
    """True si otra tarea ya usa ese nombre, sin distinguir mayúsculas.

    El unique de la BD sí distingue ("Plancha" y "plancha" entrarían).
    exclude_task_id: al editar, la propia tarea no cuenta.
    """
    query = db.select(Task).where(func.lower(Task.task_name) == name.lower())

    if exclude_task_id is not None:
        query = query.where(Task.task_id != exclude_task_id)

    return db.session.execute(query).scalar_one_or_none() is not None


def clean_description(raw_description):
    """Devuelve (descripción, None) o (None, mensaje).

    Vacía se guarda como NULL, así "sin descripción" tiene una sola forma.
    """
    if raw_description is None:
        return None, None

    if not isinstance(raw_description, str):
        return None, "La descripción debe ser un texto"

    return raw_description.strip() or None, None


@api.route("/manage/tasks", methods=["GET"])
@role_required("manager")
def get_all_tasks():
    """Todas las tareas, activas y desactivadas."""
    tasks = db.session.execute(
        db.select(Task).order_by(Task.task_id)
    ).scalars().all()

    return jsonify({"tasks": [task.serialize() for task in tasks]}), 200


@api.route("/tasks", methods=["POST"])
@role_required("manager")
def create_task():
    """Crea una tarea. Nace activa salvo que se envíe lo contrario."""
    data = get_json_body()

    if data is None:
        return jsonify({"message": "No se recibieron datos"}), 400

    # Se valida todo antes de escribir: si algo falla, la BD no se entera.
    name, error = clean_task_name(data.get("task_name"))
    if error:
        return jsonify({"message": error}), 400

    description, error = clean_description(data.get("description"))
    if error:
        return jsonify({"message": error}), 400

    is_active = data.get("is_active", True)

    # isinstance y no un simple if: el texto "false" es verdadero en Python.
    if not isinstance(is_active, bool):
        return jsonify({"message": "is_active debe ser true o false"}), 400

    # 409 como el email repetido en /register: datos bien, pero ya existe.
    if task_name_taken(name):
        return jsonify({"message": "Ya existe una tarea con ese nombre"}), 409

    task = Task(task_name=name, description=description, is_active=is_active)
    db.session.add(task)

    try:
        db.session.commit()
    except IntegrityError:
        # Dos altas simultáneas con el mismo nombre: la comprobación de
        # arriba no lo ve, pero el unique de la BD sí.
        db.session.rollback()
        return jsonify({"message": "Ya existe una tarea con ese nombre"}), 409

    return jsonify({"task": task.serialize()}), 201


@api.route("/tasks/<int:task_id>", methods=["PUT"])
@role_required("manager")
def update_task(task_id):
    """Edita nombre y/o descripción (solo lo que venga en el cuerpo).

    is_active no se toca aquí: va por PATCH, para no desactivar por error.
    """
    task = db.session.get(Task, task_id)

    if not task:
        return jsonify({"message": "Tarea no encontrada"}), 404

    data = get_json_body()

    if data is None:
        return jsonify({"message": "No se recibieron datos"}), 400

    changes = {}

    if "task_name" in data:
        name, error = clean_task_name(data["task_name"])
        if error:
            return jsonify({"message": error}), 400

        if task_name_taken(name, exclude_task_id=task_id):
            return jsonify({"message": "Ya existe una tarea con ese nombre"}), 409

        changes["task_name"] = name

    if "description" in data:
        description, error = clean_description(data["description"])
        if error:
            return jsonify({"message": error}), 400

        changes["description"] = description

    # Validado todo, ahora sí se aplica.
    for field, value in changes.items():
        setattr(task, field, value)

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"message": "Ya existe una tarea con ese nombre"}), 409

    return jsonify({"task": task.serialize()}), 200


@api.route("/tasks/<int:task_id>/status", methods=["PATCH"])
@role_required("manager")
def update_task_status(task_id):
    """Activa o desactiva una tarea. Sustituye al borrado."""
    task = db.session.get(Task, task_id)

    if not task:
        return jsonify({"message": "Tarea no encontrada"}), 404

    data = get_json_body()

    if data is None or not isinstance(data.get("is_active"), bool):
        return jsonify({"message": "Envía is_active con true o false"}), 400

    task.is_active = data["is_active"]
    db.session.commit()

    return jsonify({"task": task.serialize()}), 200


# ----------------------------------------------------------------------
# CATÁLOGO DE SERVICIOS (ENCARGADO)
# ----------------------------------------------------------------------
#   GET    /api/manage/services       todos, activos y desactivados
#   POST   /api/services              crear
#   PUT    /api/services/<id>         editar (sin estado ni slug)
#   PATCH  /api/services/<id>/status  activar o desactivar
#
# No hay DELETE: se desactiva, para no dejar reservas apuntando a la nada.

@api.route("/manage/services", methods=["GET"])
@role_required("manager")
def get_all_services():
    """Todos los servicios, activos y desactivados.

    serialize() y no serialize_public(): el encargado necesita id y estado.
    """
    services = db.session.execute(
        db.select(Service).order_by(Service.service_id)
    ).scalars().all()

    return jsonify({"services": [service.serialize() for service in services]}), 200


# Mismos topes que las columnas de Service en models.py.
SERVICE_NAME_MAX_LENGTH = 100
IMAGE_URL_MAX_LENGTH = 255

# Solo divisores de 60: la hora se reparte en tareas enteras, nunca media.
ALLOWED_MINUTES_PER_TASK = (10, 12, 15, 20, 30, 60)


def is_whole_number(value):
    """True si es un entero de verdad.

    bool se descarta: en Python True vale 1 y "min_hours": true colaría.
    """
    return isinstance(value, int) and not isinstance(value, bool)


def validate_service(data, current=None):
    """Valida un servicio. Devuelve (campos, None) o (None, mensaje).

    Al editar se pasa current: lo que no venga se toma de él, y así se
    pueden comprobar reglas entre dos campos (min_hours nuevo vs max_hours).
    """

    def pick(field, default=None):
        if field in data:
            return data[field]
        if current is not None:
            return getattr(current, field)
        return default

    fields = {}

    # ---- nombre ----
    name = pick("name")
    if not isinstance(name, str) or not name.strip():
        return None, "El nombre del servicio es obligatorio"
    name = name.strip()
    if len(name) > SERVICE_NAME_MAX_LENGTH:
        return None, f"El nombre no puede superar los {SERVICE_NAME_MAX_LENGTH} caracteres"
    # Sin letras ni números no se puede generar el slug.
    if not slugify(name):
        return None, "El nombre tiene que contener al menos una letra o un número"
    fields["name"] = name

    # ---- descripción corta: obligatoria ----
    description = pick("description")
    if not isinstance(description, str) or not description.strip():
        return None, "La descripción es obligatoria"
    fields["description"] = description.strip()

    # ---- textos opcionales ----
    fields["long_description"], error = clean_optional_text(
        pick("long_description"), "La descripción larga")
    if error:
        return None, error

    fields["image_url"], error = clean_optional_text(
        pick("image_url"), "La URL de la imagen", IMAGE_URL_MAX_LENGTH)
    if error:
        return None, error

    # ---- precio ----
    rate = pick("base_hourly_rate")
    if isinstance(rate, bool) or not isinstance(rate, (int, float)) or rate <= 0:
        return None, "El precio por hora tiene que ser un número mayor que cero"
    fields["base_hourly_rate"] = rate

    # ---- minutos por tarea (NULL = el servicio no lleva tareas) ----
    minutes = pick("minutes_per_task")
    if minutes is not None and (not is_whole_number(minutes) or minutes not in ALLOWED_MINUTES_PER_TASK):
        allowed = ", ".join(str(m) for m in ALLOWED_MINUTES_PER_TASK)
        return None, f"Los minutos por tarea tienen que ser uno de estos: {allowed}. O vacío si el servicio no lleva tareas"
    fields["minutes_per_task"] = minutes

    # ---- horas contratables ----
    min_hours = pick("min_hours", 1)
    if not is_whole_number(min_hours) or min_hours < 1:
        return None, "El mínimo de horas tiene que ser un número entero, 1 o más"
    fields["min_hours"] = min_hours

    hour_step = pick("hour_step", 1)
    if not is_whole_number(hour_step) or hour_step < 1:
        return None, "El salto de horas tiene que ser un número entero, 1 o más"
    fields["hour_step"] = hour_step

    # NULL = sin máximo.
    max_hours = pick("max_hours")
    if max_hours is not None and (not is_whole_number(max_hours) or max_hours < min_hours):
        return None, "El máximo de horas tiene que ser un número entero, igual o mayor que el mínimo"
    fields["max_hours"] = max_hours

    # ---- estado ----
    is_active = pick("is_active", True)
    if not isinstance(is_active, bool):
        return None, "is_active debe ser true o false"
    fields["is_active"] = is_active

    return fields, None


def service_name_taken(name, exclude_service_id=None):
    """True si otro servicio ya usa ese nombre, sin distinguir mayúsculas.

    Mismo motivo que en task_name_taken.
    """
    query = db.select(Service).where(func.lower(Service.name) == name.lower())

    if exclude_service_id is not None:
        query = query.where(Service.service_id != exclude_service_id)

    return db.session.execute(query).scalar_one_or_none() is not None


def generate_unique_slug(name):
    """Slug a partir del nombre; si ya existe, añade -2, -3...

    Pasa aunque los nombres no se repitan: "Limpieza integral" y
    "Limpieza-Integral" dan el mismo slug.
    """
    base = slugify(name)
    slug = base
    suffix = 2

    while db.session.execute(
        db.select(Service).where(Service.slug == slug)
    ).scalar_one_or_none():
        slug = f"{base}-{suffix}"
        suffix += 1

    return slug


@api.route("/services", methods=["POST"])
@role_required("manager")
def create_service():
    """Crea un servicio con slug automático. Nace activo salvo que se
    envíe lo contrario."""
    data = get_json_body()

    if data is None:
        return jsonify({"message": "No se recibieron datos"}), 400

    fields, error = validate_service(data)
    if error:
        return jsonify({"message": error}), 400

    if service_name_taken(fields["name"]):
        return jsonify({"message": "Ya existe un servicio con ese nombre"}), 409

    service = Service(slug=generate_unique_slug(fields["name"]), **fields)
    db.session.add(service)

    try:
        db.session.commit()
    except IntegrityError:
        # Dos altas simultáneas con el mismo nombre o slug.
        db.session.rollback()
        return jsonify({"message": "Ya existe un servicio con ese nombre"}), 409

    return jsonify({"service": service.serialize()}), 201


@api.route("/services/<int:service_id>", methods=["PUT"])
@role_required("manager")
def update_service(service_id):
    """Edita un servicio (solo lo que venga en el cuerpo).

    Ignora is_active (va por PATCH). El slug no se regenera al renombrar:
    rompería los enlaces que ya circulan, aunque deje de coincidir con el nombre.
    """
    service = db.session.get(Service, service_id)

    if not service:
        return jsonify({"message": "Servicio no encontrado"}), 404

    data = get_json_body()

    if data is None:
        return jsonify({"message": "No se recibieron datos"}), 400

    # Sin is_active en el cuerpo, validate_service conserva el estado actual.
    data = {field: value for field, value in data.items() if field !=
            "is_active"}

    fields, error = validate_service(data, current=service)
    if error:
        return jsonify({"message": error}), 400

    if service_name_taken(fields["name"], exclude_service_id=service_id):
        return jsonify({"message": "Ya existe un servicio con ese nombre"}), 409

    # Validado todo, ahora sí se aplica.
    for field, value in fields.items():
        setattr(service, field, value)

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"message": "Ya existe un servicio con ese nombre"}), 409

    return jsonify({"service": service.serialize()}), 200


@api.route("/services/<int:service_id>/status", methods=["PATCH"])
@role_required("manager")
def update_service_status(service_id):
    """Activa o desactiva un servicio. Sustituye al borrado.

    Desactivado desaparece de la web y del cliente, pero sigue en la BD
    para las reservas que ya lo usan. El encargado lo sigue viendo.
    """
    service = db.session.get(Service, service_id)

    if not service:
        return jsonify({"message": "Servicio no encontrado"}), 404

    data = get_json_body()

    if data is None or not isinstance(data.get("is_active"), bool):
        return jsonify({"message": "Envía is_active con true o false"}), 400

    service.is_active = data["is_active"]
    db.session.commit()

    return jsonify({"service": service.serialize()}), 200


# ----------------------------------------------------------------------
# DISPONIBILIDAD (CLIENTE)
# ----------------------------------------------------------------------
#   GET    /api/availability/workers   a quién se puede reservar
#   GET    /api/availability           los huecos de un mes
#
# El cálculo está en api/availability.py; aquí solo se lee la petición
# y se devuelve la respuesta.

def public_worker(worker):
    """Lo que ve un cliente de un trabajador: nombre con inicial, foto y
    valoración. Sin correo ni teléfono (Worker.serialize() es del encargado)."""
    user = worker.user
    last_name = (user.last_name or "").strip()
    initial = f" {last_name[0]}." if last_name else ""

    return {
        "worker_id": worker.worker_id,
        "name": f"{user.name}{initial}",
        "avatar_url": user.avatar_url,
        # Sin valorar todavía: las notas por trabajador llegan con la #20.
        "rating": None,
    }


def bookable_workers():
    """Los trabajadores que se pueden reservar (can_work), por nombre.

    selectinload trae usuarios y turnos de golpe, no uno por trabajador."""
    workers = db.session.execute(
        db.select(Worker)
        .join(User, Worker.user_id == User.user_id)
        .options(selectinload(Worker.user), selectinload(Worker.shift))
        .order_by(User.name, Worker.worker_id)
    ).scalars().all()

    return [worker for worker in workers if can_work(worker)]


@api.route("/availability/workers", methods=["GET"])
@role_required("client")
def get_availability_workers():
    """Los trabajadores que el cliente puede elegir al reservar. La opción
    "Cualquiera" no es un trabajador: la añade el panel."""
    return jsonify({"workers": [public_worker(worker) for worker in bookable_workers()]}), 200


# Tope de horas al pedir huecos. Ningún servicio llega, y evita que
# alguien pida "hours=5000" y ponga al servidor a calcular para nada.
MAX_REQUEST_HOURS = 60


@api.route("/availability", methods=["GET"])
@role_required("client")
def get_availability():
    """Los huecos de un mes para una reserva de `hours` horas.

        GET /api/availability?hours=6&worker=any&month=2026-10

    worker: "any" (Cualquiera, por defecto) o el id de un trabajador.
    Responde {"days": {"2026-10-05": [{"start": "09:00", "options": [...]}]}}
    solo con los días que tienen hueco. Cada opción: un trabajador libre y
    los días que ocuparía la reserva.
    """
    # ---- HORAS ----
    hours = request.args.get("hours", "")

    if not hours.isdigit() or not 1 <= int(hours) <= MAX_REQUEST_HOURS:
        return jsonify({"message": f"Indica las horas: un número entero entre 1 y {MAX_REQUEST_HOURS}"}), 400

    hours = int(hours)

    # ---- MES ----
    try:
        month_first_day = datetime.strptime(
            request.args.get("month", ""), "%Y-%m").date()
    except ValueError:
        return jsonify({"message": "Indica el mes con el formato AAAA-MM, por ejemplo 2026-10"}), 400

    # Solo meses dentro de la ventana de reserva (hoy + 60 días).
    now = madrid_now()
    this_month = now.date().replace(day=1)
    last_month = (now + BOOKING_HORIZON).date().replace(day=1)

    if not this_month <= month_first_day <= last_month:
        return jsonify({"message": "Ese mes está fuera de las fechas en las que se puede reservar"}), 400

    # ---- TRABAJADOR ----
    workers = bookable_workers()
    worker_param = request.args.get("worker", "any")

    if worker_param != "any":
        chosen = [worker for worker in workers if str(
            worker.worker_id) == worker_param]

        # Mismo 404 si no existe o si no se puede reservar: para el
        # cliente es lo mismo.
        if not chosen:
            return jsonify({"message": "Ese trabajador no está disponible para reservar"}), 404

        workers = chosen

    # ---- CÁLCULO ----
    # Se carga un poco más allá del fin de mes: una reserva que empieza
    # el día 30 puede tener tramos en el mes siguiente.
    next_month = (month_first_day.replace(day=28) +
                  timedelta(days=4)).replace(day=1)
    busy = load_busy(workers, month_first_day, next_month +
                     timedelta(days=SEARCH_LIMIT_DAYS))

    days = month_availability(workers, hours, month_first_day, now, busy)

    # Las fechas viajan como texto "2026-10-05": JSON no tiene fechas.
    return jsonify({
        "days": {
            day.isoformat(): [
                {
                    "start": slot["start"],
                    "options": [
                        {"worker_id": option["worker_id"], "days": [
                            d.isoformat() for d in option["days"]]}
                        for option in slot["options"]
                    ],
                }
                for slot in slots
            ]
            for day, slots in days.items()
        }
    }), 200


# ----------------------------------------------------------------------
# RESERVAS DEL CLIENTE
# ----------------------------------------------------------------------
#   POST   /api/bookings   crear una reserva
#
# De arriba abajo: las reglas, validate_booking() y create_booking().
#
# ⚠️ Las cuentas están repetidas en bookingRules.js (frontend): si cambia
# una, cambian las dos, o el panel enseñará un precio que aquí se rechaza.
# La ventana de reserva y la hora de Madrid vienen de api/availability.py:
# cada regla vive en un solo sitio.
BOOKING_MAX_TASKS = 30                 # tope de filas por reserva
BOOKING_NOTES_MAX_LENGTH = 1000


def is_int(value):
    """True si es un entero de verdad. bool cuenta como int en Python, así
    que sin esto un `true` en el JSON pasaría por un id o por una hora."""
    return isinstance(value, int) and not isinstance(value, bool)


def hours_needed(service, task_count):
    """Horas mínimas que exigen las tareas en este servicio.

        tareas × minutos  →  a horas, redondeando hacia arriba
                          →  nunca menos que el mínimo del servicio
                          →  subido hasta respetar el salto (8, 12, 16...)

    Fin de obra (sin minutos por tarea) necesita solo su mínimo.
    """
    if service.minutes_per_task is None:
        return service.min_hours

    # La hora se cobra entera: 90 minutos de trabajo son 2 horas.
    hours = math.ceil(task_count * service.minutes_per_task / 60)
    hours = max(hours, service.min_hours)

    # Cuántos saltos hacen falta por encima del mínimo.
    steps = math.ceil((hours - service.min_hours) / service.hour_step)

    return service.min_hours + steps * service.hour_step


def validate_booking(data, user):
    """Valida una reserva ANTES de escribir nada en la base de datos.

    Devuelve (campos, None) o (None, (mensaje, código)). El código es 400,
    salvo un trabajador o una dirección que no se encuentran: 404.

    No mira si el hueco está libre: eso lo hace create_booking(), dentro
    de su transacción.
    """

    # ---- SERVICIO ----
    # Llega por slug: la vista pública del servicio no expone su id.
    slug = data.get("service_slug")
    service = None

    if isinstance(slug, str):
        service = db.session.execute(
            db.select(Service).filter_by(slug=slug, is_active=True)
        ).scalar_one_or_none()

    if not service:
        return None, ("Elige un servicio disponible", 400)

    # ---- TAREAS ----
    task_ids = data.get("task_ids", [])

    if not isinstance(task_ids, list) or not all(is_int(task_id) for task_id in task_ids):
        return None, ("Las tareas no tienen un formato válido", 400)

    if service.minutes_per_task is None:
        # Fin de obra: se contrata solo por horas.
        if task_ids:
            return None, (f"{service.name} no lleva tareas: se contrata solo por horas", 400)
        tasks = []

    else:
        if not task_ids:
            return None, ("Añade al menos una tarea", 400)

        if len(task_ids) > BOOKING_MAX_TASKS:
            return None, (f"Como mucho {BOOKING_MAX_TASKS} tareas por reserva", 400)

        # Se consultan los ids sin repetir y después se rehace la lista con
        # sus repeticiones: tres habitaciones siguen siendo tres.
        unique_ids = set(task_ids)
        found = db.session.execute(
            db.select(Task).filter_by(is_active=True).where(
                Task.task_id.in_(unique_ids))
        ).scalars().all()
        by_id = {task.task_id: task for task in found}

        if len(by_id) != len(unique_ids):
            return None, ("Alguna de las tareas ya no está disponible", 400)

        tasks = [by_id[task_id] for task_id in task_ids]

    # ---- HORAS ----
    hours = data.get("hours")

    if not is_int(hours):
        return None, ("Indica cuántas horas quieres contratar", 400)

    needed = hours_needed(service, len(tasks))

    if hours < needed:
        if tasks:
            return None, (f"Tus tareas necesitan {needed} h", 400)
        return None, (f"{service.name} se contrata desde {needed} h", 400)

    if (hours - service.min_hours) % service.hour_step != 0:
        step = service.hour_step
        return None, (f"{service.name} se contrata de {step} en {step} horas", 400)

    if service.max_hours is not None and hours > service.max_hours:
        return None, (f"{service.name} se contrata como mucho {service.max_hours} h", 400)

    # ---- TRABAJADOR ----
    # "any" (Cualquiera) o el id de uno: lo mismo que acepta GET /availability.
    worker_choice = data.get("worker", "any")
    workers = bookable_workers()

    if worker_choice != "any":
        workers = [
            worker for worker in workers
            if is_int(worker_choice) and worker.worker_id == worker_choice
        ]

        # Mismo 404 si no existe o si no se puede reservar.
        if not workers:
            return None, ("Ese trabajador no está disponible para reservar", 404)

    # ---- INICIO ----
    # Llega como "2026-10-05T09:30", sin zona: es hora de Madrid.
    try:
        start = datetime.fromisoformat(data.get("start"))
    except (TypeError, ValueError):
        return None, ("Elige una fecha y una hora de inicio", 400)

    # Si llega con zona, se pasa a Madrid y se le quita: así se compara
    # siempre lo mismo con lo mismo.
    if start.tzinfo is not None:
        start = start.astimezone(MADRID).replace(tzinfo=None)

    # Solo la ventana de reserva. Si la hora cae en el turno y está libre
    # lo comprueba create_booking().
    now = madrid_now()

    if start < now + MIN_NOTICE:
        return None, ("Las reservas se hacen con al menos 24 horas de antelación", 400)

    if start > now + BOOKING_HORIZON:
        return None, ("Solo se puede reservar hasta 60 días vista", 400)

    # ---- DIRECCIÓN ----
    # owned_address() ya filtra por cliente y por activa (#13).
    address_id = data.get("address_id")
    address = owned_address(user, address_id) if is_int(address_id) else None

    if not address:
        return None, ("Dirección no encontrada", 404)

    # ---- DESCRIPCIÓN ----
    notes, error = clean_optional_text(
        data.get("notes"), "La descripción", BOOKING_NOTES_MAX_LENGTH)

    if error:
        return None, (error, 400)

    return {
        "service": service,
        "tasks": tasks,
        "hours": hours,
        "workers": workers,
        "address": address,
        "start": start,
        "notes": notes,
    }, None


def free_options_at(workers, hours, start, busy):
    """Las opciones libres para empezar justo a esa hora, o [].

    Usa month_availability, el mismo cálculo que el calendario: lo que no
    sale allí tampoco se puede reservar aquí.
    """
    day = start.date()
    slots = month_availability(
        workers, hours, day.replace(day=1), madrid_now(), busy)

    for slot in slots.get(day, []):
        if slot["start"] == start.strftime("%H:%M"):
            return slot["options"]

    return []


@api.route("/bookings", methods=["POST"])
@role_required("client")
def create_booking():
    """Crea una reserva confirmada, con su trabajador y sus tramos.

        POST /api/bookings
        {"service_slug": "limpieza-esencial", "task_ids": [1, 1, 3],
         "hours": 2, "worker": "any", "start": "2026-10-05T09:00",
         "address_id": 4, "notes": ""}

    Responde 201 {"booking": {...}}. El total lo calcula el servidor: lo
    que mande el navegador ni se lee.
    """
    user = current_user()
    data = get_json_body()

    if data is None:
        return jsonify({"message": "No se recibieron datos"}), 400

    fields, error = validate_booking(data, user)

    if error:
        message, code = error
        return jsonify({"message": message}), code

    workers = fields["workers"]
    hours = fields["hours"]
    start = fields["start"]
    day = start.date()

    # Bloquea a los candidatos hasta el commit: si dos clientes piden el
    # mismo hueco a la vez, el segundo espera aquí y vuelve a mirar.
    db.session.execute(
        db.select(Worker)
        .where(Worker.worker_id.in_([worker.worker_id for worker in workers]))
        .with_for_update()
    )

    busy = load_busy(workers, day, day + timedelta(days=SEARCH_LIMIT_DAYS))
    options = free_options_at(workers, hours, start, busy)

    if not options:
        # Sin reservas por medio: si entonces sí había hueco, es que acaban
        # de ocuparlo; si tampoco, esa hora nunca fue reservable.
        if free_options_at(workers, hours, start, {}):
            return jsonify({"message": "Ese hueco acaba de ocuparse, elige otro"}), 409

        return jsonify({"message": "Esa hora no está disponible para reservar"}), 400

    # Con "Cualquiera", el que menos horas tenga ese día.
    by_id = {worker.worker_id: worker for worker in workers}
    worker = pick_worker([by_id[option["worker_id"]]
                         for option in options], busy, day)

    service = fields["service"]
    intervals = booking_intervals(worker, start, hours)

    booking = Booking(
        client_id=user.user_id,
        service_id=service.service_id,
        address_id=fields["address"].address_id,
        worker_id=worker.worker_id,
        scheduled_start=intervals[0][0],
        scheduled_end=intervals[-1][1],
        # Congelados: si el servicio cambia, esta reserva conserva los suyos.
        hourly_rate=service.base_hourly_rate,
        minutes_per_task=service.minutes_per_task,
        total_price=round(hours * service.base_hourly_rate, 2),
        status=BookingStatus.CONFIRMED,
        client_notes=fields["notes"],
        created_at=madrid_now(),
    )

    # Se guardan con la reserva gracias a la relación Booking.days.
    for begins, ends in intervals:
        booking.days.append(BookingDay(starts_at=begins, ends_at=ends))

    db.session.add(booking)

    # flush: pide el id de la reserva sin cerrar la transacción.
    db.session.flush()

    for task in fields["tasks"]:
        db.session.add(BookingTask(
            booking_id=booking.booking_id,
            task_id=task.task_id,
            task_name=task.task_name,
            status=BookingTaskStatus.PENDING,
        ))

    db.session.commit()

    return jsonify({
        "booking": {**booking.serialize_detail(), "worker": public_worker(worker)}
    }), 201



@api.route("/booking-tasks/<int:task_id>", methods=["PATCH"])
@role_required("worker")
@booking_transaction
def complete_booking_task(task_id):
    data = request.get_json(silent=True)

    if not isinstance(data, dict) or data.get("status") not in (
        "pending",
        "completed",
    ):
        return jsonify({
            "message": 'El estado debe ser "pending" o "completed".'
        }), 400

    user_id = int(get_jwt_identity())

    booking_id = db.session.execute(
        db.select(BookingTask.booking_id).where(
            BookingTask.booking_task_id == task_id
        )
    ).scalar_one_or_none()

    if booking_id is None:
        return jsonify({"message": "Tarea no encontrada."}), 404

    booking = db.session.execute(
        db.select(Booking).where(
            Booking.booking_id == booking_id
        ).with_for_update()
    ).scalar_one_or_none()

    if booking is None:
        return jsonify({"message": "Reserva no encontrada."}), 404

    worker = db.session.get(Worker, booking.worker_id)
    if worker is None or worker.user_id != user_id:
        return jsonify({
            "message": "Solo puedes modificar tareas de tus reservas asignadas."
        }), 403

    # En curso: las tareas se marcan mientras se trabaja. Esto sustituye
    # a la comprobación de la fecha, que ya hace "Empezar".
    if booking.status != BookingStatus.IN_PROGRESS:
        return jsonify({
            "message": "Tienes que empezar el servicio antes de marcar tareas."
        }), 409

    now = madrid_now()

    task = db.session.get(BookingTask, task_id)
    if task is None:
        return jsonify({"message": "Tarea no encontrada."}), 404

    new_status = BookingTaskStatus(data["status"])

    # El antes y el después son obligatorios para cerrar una tarea: son
    # la prueba de cómo quedó. Desmarcarla no pide nada y las conserva.
    if new_status == BookingTaskStatus.COMPLETED:
        kinds = {photo.kind for photo in task.photos}

        if not {MediaKind.BEFORE, MediaKind.AFTER} <= kinds:
            return jsonify({
                "message": "Sube la foto del antes y la del después para cerrar la tarea."
            }), 409

    # Repetir la misma petición conserva la fecha original.
    if task.status != new_status:
        task.status = new_status
        task.completed_at = (
            now if new_status == BookingTaskStatus.COMPLETED else None
        )
        booking.updated_at = now

    db.session.commit()

    return jsonify({"task": task.serialize()}), 200


@api.route("/bookings", methods=["GET"])
@api.route("/my/bookings", methods=["GET"])
@role_required("client", "worker")
def my_bookings():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)

    if user.role == "client":
        if "worker_id" in request.args:
            return jsonify({
                "message": "El cliente solo puede consultar sus propias reservas."
            }), 403

        parameter = "client_id"
        own_id = user_id
        booking_filter = Booking.client_id == user_id
    else:
        if "client_id" in request.args:
            return jsonify({
                "message": "El trabajador solo puede consultar sus reservas asignadas."
            }), 403

        worker = db.session.execute(
            db.select(Worker).where(Worker.user_id == user_id)
        ).scalar_one_or_none()

        if worker is None:
            return jsonify({
                "message": "No tienes un perfil de trabajador."
            }), 403

        parameter = "worker_id"
        own_id = worker.worker_id
        booking_filter = Booking.worker_id == worker.worker_id

    requested_id = request.args.get(parameter)

    if requested_id is not None:
        try:
            requested_id = int(requested_id)
        except ValueError:
            return jsonify({
                "message": f"{parameter} debe ser un entero."
            }), 400

        if requested_id != own_id:
            return jsonify({
                "message": "Solo puedes consultar tus propias reservas."
            }), 403

    bookings = db.session.execute(
        db.select(Booking).options(
            selectinload(Booking.worker).selectinload(Worker.user),
            selectinload(Booking.client),
            selectinload(Booking.days),
            selectinload(Booking.service),
            selectinload(Booking.address),
            # Las tareas con sus fotos y las incidencias con las suyas: el
            # detalle las pinta todas, y sin precargarlas sería una consulta
            # por cada tarea y otra por cada incidencia.
            selectinload(Booking.tasks).selectinload(BookingTask.photos),
            selectinload(Booking.incidents).selectinload(Incident.media),
        ).where(
            booking_filter
        ).order_by(
            Booking.scheduled_start.desc(),
            Booking.booking_id.desc(),
        )
    ).scalars().all()

    return jsonify({
        "bookings": [booking.serialize_detail() for booking in bookings]
    })


@api.route("/bookings/<int:booking_id>/complete", methods=["PATCH"])
@role_required("worker")
@booking_transaction
def complete_booking(booking_id):
    user_id = int(get_jwt_identity())

    booking = db.session.execute(
        db.select(Booking).where(
            Booking.booking_id == booking_id
        ).with_for_update()
    ).scalar_one_or_none()

    if booking is None:
        return jsonify({"message": "Reserva no encontrada."}), 404

    worker = db.session.get(Worker, booking.worker_id)
    if worker is None or worker.user_id != user_id:
        return jsonify({
            "message": "Solo puedes completar tus reservas asignadas."
        }), 403

    if booking.status == BookingStatus.COMPLETED:
        return jsonify({"booking": booking.serialize_detail()}), 200

    # En curso y no confirmada: para finalizar hay que haber empezado.
    if booking.status != BookingStatus.IN_PROGRESS:
        return jsonify({
            "message": "Tienes que empezar el servicio antes de finalizarlo."
        }), 409

    now = madrid_now()

    last_service_day = max(
        (day.starts_at.date() for day in booking.days),
        default=booking.scheduled_start.date(),
    )

    if last_service_day > now.date():
        return jsonify({
            "message": "No puedes completar la reserva antes de su último día de servicio."
        }), 409

    tasks = db.session.execute(
        db.select(BookingTask).where(
            BookingTask.booking_id == booking_id
        )
    ).scalars().all()

    if any(task.status != BookingTaskStatus.COMPLETED for task in tasks):
        return jsonify({
            "message": "Debes completar todas las tareas antes de finalizar la reserva."
        }), 409

    booking.status = BookingStatus.COMPLETED
    booking.updated_at = now

    # De completed_at salen los 3 días que tiene el cliente para
    # confirmar (#83). Sin esta fecha no se le puede pedir nada.
    booking.completed_at = now

    # El último día se cierra solo al finalizar: el trabajador no tiene
    # que pulsar "Terminar el día" y además "Finalizar servicio".
    for day in booking.days:
        if day.started_at and not day.finished_at:
            day.finished_at = now
    db.session.commit()

    return jsonify({"booking": booking.serialize_detail()}), 200


# ----------------------------------------------------------------------
# EL DÍA DE TRABAJO (#82)
# ----------------------------------------------------------------------
#   POST  /api/bookings/<id>/days/<day_id>/start    trabajador asignado
#   POST  /api/bookings/<id>/days/<day_id>/finish   trabajador asignado
#
# Lo previsto vive en starts_at y ends_at; aquí se guarda lo que pasó de
# verdad. Un servicio de varios días se empieza y se cierra cada día, así
# que las horas reales van en el tramo y no en la reserva.


def worker_day(booking_id, day_id):
    """La reserva y el tramo, comprobando que son de quien pregunta.

    Devuelve (booking, day, None) si todo está en orden, o
    (None, None, (respuesta, código)) con el motivo del rechazo.

    La reserva se bloquea con with_for_update: dos móviles pulsando
    "Empezar" a la vez no pueden escribir dos horas distintas.
    """
    user_id = int(get_jwt_identity())

    booking = db.session.execute(
        db.select(Booking).where(
            Booking.booking_id == booking_id
        ).with_for_update()
    ).scalar_one_or_none()

    if booking is None:
        return None, None, (jsonify({"message": "Reserva no encontrada."}), 404)

    worker = db.session.get(Worker, booking.worker_id)

    if worker is None or worker.user_id != user_id:
        return None, None, (jsonify({
            "message": "Solo puedes trabajar en tus reservas asignadas."
        }), 403)

    day = db.session.get(BookingDay, day_id)

    # El tramo tiene que ser de esta reserva: con el id de otra se podría
    # escribir en una reserva ajena.
    if day is None or day.booking_id != booking_id:
        return None, None, (jsonify({"message": "Día no encontrado."}), 404)

    return booking, day, None


@api.route("/bookings/<int:booking_id>/days/<int:day_id>/start", methods=["POST"])
@role_required("worker")
@booking_transaction
def start_booking_day(booking_id, day_id):
    """Marca la llegada. El primer día pone la reserva en curso."""
    booking, day, error = worker_day(booking_id, day_id)

    if error:
        return error

    # Repetir la petición no reescribe la hora: la primera es la buena.
    if day.started_at:
        return jsonify({"booking": booking.serialize_detail()}), 200

    if booking.status not in (BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS):
        return jsonify({
            "message": "Esta reserva ya no se puede empezar."
        }), 409

    now = madrid_now()

    # Solo el día del tramo: empezar la víspera falsearía la hora real.
    if day.starts_at.date() != now.date():
        return jsonify({
            "message": "Solo puedes empezar el día del servicio."
        }), 409

    day.started_at = now

    # started_at de la reserva es el del primer día que se empieza.
    if booking.started_at is None:
        booking.started_at = now

    booking.status = BookingStatus.IN_PROGRESS
    booking.updated_at = now

    db.session.commit()

    return jsonify({"booking": booking.serialize_detail()}), 200


@api.route("/bookings/<int:booking_id>/days/<int:day_id>/finish", methods=["POST"])
@role_required("worker")
@booking_transaction
def finish_booking_day(booking_id, day_id):
    """Cierra el día. El servicio se finaliza aparte, el último día."""
    booking, day, error = worker_day(booking_id, day_id)

    if error:
        return error

    if day.finished_at:
        return jsonify({"booking": booking.serialize_detail()}), 200

    if day.started_at is None:
        return jsonify({
            "message": "Este día todavía no se ha empezado."
        }), 409

    now = madrid_now()

    day.finished_at = now
    booking.updated_at = now

    db.session.commit()

    return jsonify({"booking": booking.serialize_detail()}), 200


# ----------------------------------------------------------------------
# FOTOS DE UNA TAREA (#82)
# ----------------------------------------------------------------------
#   POST    /api/booking-tasks/<id>/photos    trabajador asignado
#   DELETE  /api/media/<id>                   trabajador asignado
#
# El antes y el después que el trabajador sube para cerrar cada tarea.
# Son la prueba de cómo quedó la casa: de ellas vive la confirmación del
# cliente (#83) y, si reclama, la respuesta del encargado (#19).


def task_in_progress(task_id):
    """La tarea y su reserva, si es de quien pregunta y está en curso.

    Devuelve (task, booking, None), o (None, None, (respuesta, código)).
    Las fotos solo se tocan con el servicio en marcha: ni antes de llegar
    ni después de finalizarlo.
    """
    user_id = int(get_jwt_identity())

    task = db.session.get(BookingTask, task_id)

    if task is None:
        return None, None, (jsonify({"message": "Tarea no encontrada."}), 404)

    booking = db.session.execute(
        db.select(Booking).where(
            Booking.booking_id == task.booking_id
        ).with_for_update()
    ).scalar_one_or_none()

    if booking is None:
        return None, None, (jsonify({"message": "Reserva no encontrada."}), 404)

    worker = db.session.get(Worker, booking.worker_id)

    if worker is None or worker.user_id != user_id:
        return None, None, (jsonify({
            "message": "Solo puedes subir fotos de tus reservas asignadas."
        }), 403)

    if booking.status != BookingStatus.IN_PROGRESS:
        return None, None, (jsonify({
            "message": "Solo puedes tocar las fotos con el servicio en curso."
        }), 409)

    return task, booking, None


@api.route("/booking-tasks/<int:task_id>/photos", methods=["POST"])
@role_required("worker")
@booking_transaction
def upload_task_photo(task_id):
    """Sube el antes o el después de una tarea.

    Llega como archivo (multipart/form-data): el campo `photo` con la
    imagen y `kind` con "before" o "after".
    """
    task, booking, error = task_in_progress(task_id)

    if error:
        return error

    kind_value = request.form.get("kind")

    if kind_value not in ("before", "after"):
        return jsonify({
            "message": 'La foto debe ser "before" o "after".'
        }), 400

    # Antes de leer nada: un archivo enorme no se carga en memoria solo
    # para caducar. El margen cubre las cabeceras del multipart.
    if request.content_length and request.content_length > PHOTO_MAX_BYTES + 8192:
        return jsonify({"message": "La foto no puede pesar más de 5 MB"}), 400

    url, error = upload_image(request.files.get("photo"), BOOKING_FOLDER)

    if error:
        message, status = error
        return jsonify({"message": message}), status

    kind = MediaKind(kind_value)

    # Repetir el antes sustituye al anterior: dos "antes" de la misma
    # tarea no significan nada, y el segundo sería el bueno.
    previous = db.session.execute(
        db.select(Media).where(
            Media.booking_task_id == task_id,
            Media.kind == kind,
        )
    ).scalars().all()

    for photo in previous:
        db.session.delete(photo)

    media = Media(
        booking_task_id=task_id,
        kind=kind,
        media_url=url,
        media_type=MediaType.IMAGE,
        uploaded_by=int(get_jwt_identity()),
        uploaded_at=madrid_now(),
    )

    db.session.add(media)
    booking.updated_at = madrid_now()

    db.session.commit()

    return jsonify({"media": media.serialize()}), 201


@api.route("/media/<int:media_id>", methods=["DELETE"])
@role_required("worker")
@booking_transaction
def delete_task_photo(media_id):
    """Borra una foto mal hecha, mientras la tarea sigue abierta."""
    media = db.session.get(Media, media_id)

    if media is None:
        return jsonify({"message": "Foto no encontrada."}), 404

    # Las de una incidencia no se borran desde aquí: son de la #18.
    if media.booking_task_id is None:
        return jsonify({
            "message": "Esta foto no es de una tarea."
        }), 409

    task, booking, error = task_in_progress(media.booking_task_id)

    if error:
        return error

    # Con la tarea cerrada, las fotos son su prueba y no se tocan:
    # primero hay que desmarcarla.
    if task.status == BookingTaskStatus.COMPLETED:
        return jsonify({
            "message": "Desmarca la tarea para cambiar sus fotos."
        }), 409

    db.session.delete(media)
    booking.updated_at = madrid_now()

    db.session.commit()

    return jsonify({"message": "Foto borrada."}), 200


# ----------------------------------------------------------------------
# INCIDENCIAS DEL TRABAJADOR (#18)
# ----------------------------------------------------------------------
#   POST  /api/bookings/<id>/incidents   trabajador asignado
#
# Lo que sale mal durante un servicio, con su tipo y su foto. Nacen
# abiertas y las cierra el encargado (#19). Una incidencia abierta NO
# impide terminar el día ni finalizar: si bloqueara, un trabajador con
# una figura rota se quedaría sin poder cerrar su jornada.

# Lo que cabe en una descripción. Más que eso no es una incidencia, es
# un parte, y se cuenta por teléfono.
INCIDENT_TEXT_MAX_LENGTH = 500


def worker_booking(booking_id):
    """La reserva, si es de quien pregunta y todavía admite incidencias.

    Devuelve (booking, None) o (None, (respuesta, código)).
    """
    user_id = int(get_jwt_identity())

    booking = db.session.execute(
        db.select(Booking).where(
            Booking.booking_id == booking_id
        ).with_for_update()
    ).scalar_one_or_none()

    if booking is None:
        return None, (jsonify({"message": "Reserva no encontrada."}), 404)

    worker = db.session.get(Worker, booking.worker_id)

    if worker is None or worker.user_id != user_id:
        return None, (jsonify({
            "message": "Solo puedes abrir incidencias de tus reservas asignadas."
        }), 403)

    # Una reserva cancelada ya no tiene servicio del que informar.
    if booking.status == BookingStatus.CANCELLED:
        return None, (jsonify({
            "message": "Esta reserva está cancelada."
        }), 409)

    return booking, None


def read_incident_form(booking):
    """Valida el formulario y devuelve (datos, None) o (None, error).

    Llega como multipart porque puede traer foto, así que los campos se
    leen de request.form y no de un JSON.
    """
    # "No realizado" no pregunta el tipo: lo fuerza a cliente después.
    kind = request.form.get("incident_type") or "client"

    if kind not in ("client", "company"):
        return None, (jsonify({
            "message": 'El tipo debe ser "client" o "company".'
        }), 400)

    description = (request.form.get("description") or "").strip()

    if not description:
        return None, (jsonify({
            "message": "Cuenta qué ha pasado."
        }), 400)

    if len(description) > INCIDENT_TEXT_MAX_LENGTH:
        return None, (jsonify({
            "message": f"La descripción no puede pasar de {INCIDENT_TEXT_MAX_LENGTH} caracteres."
        }), 400)

    # La tarea es opcional, pero si viene tiene que ser de esta reserva:
    # con el id de otra se colgaría la incidencia donde no toca.
    task_id = request.form.get("booking_task_id")

    if task_id:
        task = db.session.get(BookingTask, int(task_id)) if task_id.isdigit() else None

        if task is None or task.booking_id != booking.booking_id:
            return None, (jsonify({
                "message": "Esa tarea no es de esta reserva."
            }), 400)

    return {
        "incident_type": IncidentType(kind),
        "description": description,
        "booking_task_id": int(task_id) if task_id else None,
    }, None


def add_incident(booking, data, incident_type=None):
    """Crea la incidencia y le cuelga la foto, si la hay.

    incident_type fuerza el tipo: lo usa "no realizado", donde siempre es
    de cliente y no se pregunta.

    Devuelve (incidencia, None) o (None, error).
    """
    photo = request.files.get("photo")
    url = None

    if photo and photo.filename:
        url, error = upload_image(photo, INCIDENT_FOLDER)

        if error:
            message, status = error
            return None, (jsonify({"message": message}), status)

    now = madrid_now()

    incident = Incident(
        booking_id=booking.booking_id,
        worker_id=booking.worker_id,
        booking_task_id=data["booking_task_id"],
        incident_type=incident_type or data["incident_type"],
        source=IncidentSource.WORKER,
        reported_by=int(get_jwt_identity()),
        description=data["description"],
        resolved=False,
        created_at=now,
    )

    db.session.add(incident)

    # flush: hace falta el id de la incidencia para colgarle la foto.
    db.session.flush()

    if url:
        db.session.add(Media(
            incident_id=incident.incident_id,
            kind=MediaKind.INCIDENT,
            media_url=url,
            media_type=MediaType.IMAGE,
            uploaded_by=int(get_jwt_identity()),
            uploaded_at=now,
        ))

    booking.updated_at = now

    return incident, None


@api.route("/bookings/<int:booking_id>/incidents", methods=["POST"])
@role_required("worker")
@booking_transaction
def create_incident(booking_id):
    """Abre una incidencia en un servicio. Multipart, con foto opcional."""
    booking, error = worker_booking(booking_id)

    if error:
        return error

    data, error = read_incident_form(booking)

    if error:
        return error

    incident, error = add_incident(booking, data)

    if error:
        return error

    db.session.commit()

    return jsonify({"booking": booking.serialize_detail()}), 201


@api.route("/bookings/<int:booking_id>/not-done", methods=["POST"])
@role_required("worker")
@booking_transaction
def mark_booking_not_done(booking_id):
    """El servicio no se ha podido hacer.

    Crea la incidencia y cierra la reserva, las dos cosas o ninguna: si
    la foto falla, el estado no debe cambiar y quedarse sin explicación.

    El tipo es siempre de cliente y no se pregunta: por definición, un
    servicio que no se pudo hacer fue por algo ajeno a CleanFlow. Si el
    motivo fuera nuestro, esto no se marca: se reprograma.
    """
    booking, error = worker_booking(booking_id)

    if error:
        return error

    if booking.status not in (BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS):
        return jsonify({
            "message": "Este servicio ya está cerrado."
        }), 409

    now = madrid_now()

    # Solo el día del servicio: no se puede dar por perdido de antemano
    # ni rescatar uno de la semana pasada.
    if not any(day.starts_at.date() == now.date() for day in booking.days):
        return jsonify({
            "message": "Solo puedes marcarlo el día del servicio."
        }), 409

    data, error = read_incident_form(booking)

    if error:
        return error

    incident, error = add_incident(booking, data, incident_type=IncidentType.CLIENT)

    if error:
        return error

    # El trabajador estuvo allí, aunque no pudiera trabajar: queda la
    # hora de cuando se plantó en la puerta.
    if booking.started_at is None:
        booking.started_at = now

    booking.status = BookingStatus.NOT_DONE
    booking.updated_at = now

    db.session.commit()

    return jsonify({"booking": booking.serialize_detail()}), 200


# ----------------------------------------------------------------------
# FORMULARIOS PÚBLICOS: CANDIDATURAS Y MENSAJES DE CONTACTO
# ----------------------------------------------------------------------
#   POST   /api/job-applications                público
#   GET    /api/job-applications                encargado
#   PATCH  /api/job-applications/<id>/status    encargado
#   POST   /api/contact-messages                público
#   GET    /api/contact-messages                encargado
#   PATCH  /api/contact-messages/<id>/status    encargado


@api.route("/job-applications", methods=["POST"])
def create_job_application():
    data = get_json_body()

    if data is None:
        return jsonify({
            "message": "No se recibieron datos válidos"
        }), 400

    # Honeypot antispam.
    # Los usuarios reales dejan este campo vacío.
    if data.get("website"):
        return jsonify({
            "message": "Candidatura recibida correctamente"
        }), 201

    required_fields = [
        "name",
        "last_name",
        "email",
        "phone",
        "experience",
        "message",
    ]

    for field in required_fields:
        value = data.get(field)

        if not isinstance(value, str) or not value.strip():
            return jsonify({
                "message": "Todos los campos son obligatorios"
            }), 400

    # Mismos topes que las columnas de JobApplication.
    APPLICATION_MAX_LENGTHS = {
        "name": 100,
        "last_name": 150,
        "email": 120,
        "phone": 20
    }

    for field, max_length in APPLICATION_MAX_LENGTHS.items():
        if len(data[field].strip()) > max_length:
            return jsonify({
                "message": f"El campo {field} no puede superar los {max_length} caracteres"
            }), 400

    email = data["email"].strip()

    if not is_valid_email(email):
        return jsonify({
            "message": "El correo electrónico no es válido"
        }), 400

    application = JobApplication(
        name=data["name"].strip(),
        last_name=data["last_name"].strip(),
        email=email,
        phone=data["phone"].strip(),
        experience=data["experience"].strip(),
        message=data["message"].strip(),
        status=ApplicationStatus.NEW,
    )

    db.session.add(application)
    db.session.commit()

    return jsonify({
        "message": "Candidatura recibida correctamente"
    }), 201


@api.route("/contact-messages", methods=["POST"])
def create_contact_message():
    data = get_json_body()

    if data is None:
        return jsonify({
            "message": "No se recibieron datos válidos"
        }), 400

    # Honeypot antispam.
    # Si un bot rellena este campo, respondemos como si todo fuera correcto
    # pero no guardamos el mensaje.
    if data.get("website"):
        return jsonify({
            "message": "Mensaje recibido correctamente"
        }), 201

    required_fields = [
        "name",
        "email",
        "subject",
        "message",
    ]

    for field in required_fields:
        value = data.get(field)

        if not isinstance(value, str) or not value.strip():
            return jsonify({
                "message": "Todos los campos obligatorios deben estar completos"
            }), 400

    # Mismos topes que las columnas de ContactMessage.
    CONTACT_MAX_LENGTHS = {
        "name": 100,
        "email": 120,
        "subject": 150
    }

    for field, max_length in CONTACT_MAX_LENGTHS.items():
        if len(data[field].strip()) > max_length:
            return jsonify({
                "message": f"El campo {field} no puede superar los {max_length} caracteres"
            }), 400

    email = data["email"].strip()

    if not is_valid_email(email):
        return jsonify({
            "message": "El correo electrónico no es válido"
        }), 400

    phone = data.get("phone")

    if isinstance(phone, str):
        phone = phone.strip() or None
    else:
        phone = None

    if phone and len(phone) > 20:
        return jsonify({
            "message": "El teléfono no puede superar los 20 caracteres"
        }), 400

    contact_message = ContactMessage(
        name=data["name"].strip(),
        email=email,
        phone=phone,
        subject=data["subject"].strip(),
        message=data["message"].strip(),
        status=ApplicationStatus.NEW,
    )

    db.session.add(contact_message)
    db.session.commit()

    return jsonify({
        "message": "Mensaje recibido correctamente"
    }), 201


@api.route("/job-applications", methods=["GET"])
@role_required("manager")
def get_job_applications():
    applications = JobApplication.query.order_by(
        JobApplication.created_at.desc()
    ).all()

    return jsonify([
        application.serialize()
        for application in applications
    ]), 200


@api.route("/contact-messages", methods=["GET"])
@role_required("manager")
def get_contact_messages():
    messages = ContactMessage.query.order_by(
        ContactMessage.created_at.desc()
    ).all()

    return jsonify([
        message.serialize()
        for message in messages
    ]), 200


@api.route("/job-applications/<int:application_id>/status", methods=["PATCH"])
@role_required("manager")
def update_job_application_status(application_id):
    data = get_json_body()

    if data is None:
        return jsonify({
            "message": "No se recibieron datos válidos"
        }), 400

    status_value = data.get("status")

    valid_statuses = {
        status.value for status in ApplicationStatus
    }

    if status_value not in valid_statuses:
        return jsonify({
            "message": "El estado no es válido"
        }), 400

    application = db.session.get(JobApplication, application_id)

    if application is None:
        return jsonify({
            "message": "Candidatura no encontrada"
        }), 404

    application.status = ApplicationStatus(status_value)

    db.session.commit()

    return jsonify({
        "message": "Estado actualizado correctamente",
        "application": application.serialize()
    }), 200


@api.route("/contact-messages/<int:contact_message_id>/status", methods=["PATCH"])
@role_required("manager")
def update_contact_message_status(contact_message_id):
    data = get_json_body()

    if data is None:
        return jsonify({
            "message": "No se recibieron datos válidos"
        }), 400

    status_value = data.get("status")

    valid_statuses = {
        status.value for status in ApplicationStatus
    }

    if status_value not in valid_statuses:
        return jsonify({
            "message": "El estado no es válido"
        }), 400

    contact_message = db.session.get(
        ContactMessage,
        contact_message_id
    )

    if contact_message is None:
        return jsonify({
            "message": "Mensaje de contacto no encontrado"
        }), 404

    contact_message.status = ApplicationStatus(status_value)

    db.session.commit()

    return jsonify({
        "message": "Estado actualizado correctamente",
        "contact_message": contact_message.serialize()
    }), 200
