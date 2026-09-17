"""
ENDPOINTS DE LA API DE CLEANFLOW. Todo cuelga de /api (prefijo puesto en app.py).

  Públicas:     /register, /login
  Con sesión:   @jwt_required()         -> token válido, cualquier rol
  Con permiso:  @role_required("...")   -> token + rol correcto (403 si no)

@role_required ya comprueba el token: no se le añade @jwt_required() encima.
"""

import re

import cloudinary
import cloudinary.uploader
from flask import Flask, request, jsonify, url_for, Blueprint
from api.models import db, User, Task, Service, Worker
from api.utils import generate_sitemap, APIException, role_required, slugify
from flask_cors import CORS
from datetime import datetime
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from flask_bcrypt import generate_password_hash
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError


api = Blueprint("api", __name__)

# El frontend (puerto 3000) y la API (3001) son orígenes distintos: sin
# CORS el navegador bloquearía las respuestas.
CORS(api)


# ----------------------------------------------------------------------
# AYUDANTES COMUNES
# ----------------------------------------------------------------------

def get_json_body():
    """Devuelve el cuerpo si es un objeto JSON, o None.

    silent=True evita la excepción con cuerpo vacío o no JSON; [] o "texto"
    tampoco valen porque luego se usa .get().
    """
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else None


@api.route("/hello", methods=["POST", "GET"])
def handle_hello():

    response_body = {
        "message": "Hello! I'm a message that came from the backend, check the network tab on the google inspector and you will see the GET request"
    }

    return jsonify(response_body), 200


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
    workers = Worker.query.all()

    return jsonify({
        "workers": [
            worker.serialize()
            for worker in workers
        ]
    }), 200


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

# Foto de perfil. 2 MB y 256x256 bastan para un avatar, y la cuenta
# gratuita de Cloudinary tiene límite de espacio.
AVATAR_ALLOWED_TYPES = ("image/jpeg", "image/png", "image/webp")
AVATAR_MAX_BYTES = 2 * 1024 * 1024
AVATAR_FOLDER = "cleanflow/avatars"

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

    photo = request.files.get("avatar")

    if photo is None or not photo.filename:
        return jsonify({"message": "Envía la foto en el campo avatar"}), 400

    if photo.mimetype not in AVATAR_ALLOWED_TYPES:
        return jsonify({"message": "La foto tiene que ser JPG, PNG o WEBP"}), 400

    content = photo.read()

    if not content:
        return jsonify({"message": "El archivo está vacío"}), 400

    if len(content) > AVATAR_MAX_BYTES:
        return jsonify({"message": "La foto no puede pesar más de 2 MB"}), 400

    # Antes de intentar subir: sin claves, el fallo es de configuración y no
    # del usuario. 503 y no 500, que sería "algo se ha roto".
    if not cloudinary_is_configured():
        return jsonify({"message": "La subida de fotos no está configurada. Falta CLOUDINARY_URL"}), 503

    try:
        result = cloudinary.uploader.upload(
            content,
            public_id=avatar_public_id(user),
            overwrite=True,
            # invalidate: borra la copia en caché de la foto anterior.
            invalidate=True,
            resource_type="image",
            # Cuadrada y centrada en la cara, que es lo que se ve en el avatar.
            transformation=[{"width": 256, "height": 256, "crop": "fill", "gravity": "face"}],
        )
    except Exception as error:
        # Cloudinary caído, sin internet o claves mal: no es culpa de quien sube.
        print("Fallo al subir la foto a Cloudinary:", error)
        return jsonify({"message": "No se ha podido subir la foto. Inténtalo de nuevo"}), 502

    # secure_url: la https, y con el número de versión, así el navegador no
    # sigue enseñando la foto anterior de su caché.
    user.avatar_url = result.get("secure_url")
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
            cloudinary.uploader.destroy(avatar_public_id(user), invalidate=True)
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
    fields["long_description"], error = clean_optional_text(pick("long_description"), "La descripción larga")
    if error:
        return None, error

    fields["image_url"], error = clean_optional_text(pick("image_url"), "La URL de la imagen", IMAGE_URL_MAX_LENGTH)
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
    data = {field: value for field, value in data.items() if field != "is_active"}

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