"""
Endpoints de la API de CleanFlow.

Todas las rutas de este archivo cuelgan de /api (el prefijo se aplica al
registrar el blueprint en app.py).

Tres niveles de acceso, de menos a más restrictivo:
  - Públicas:      /register, /login
  - Con sesión:    @jwt_required()          -> hace falta un token válido
  - Con permiso:   @role_required("...")    -> además, el rol correcto
"""
import re
from flask import Flask, request, jsonify, url_for, Blueprint
from api.models import db, User, Task, Service
from api.utils import generate_sitemap, APIException, role_required
from flask_cors import CORS
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from flask_bcrypt import generate_password_hash
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError

api = Blueprint("api", __name__)

# Permite que el frontend (puerto 3000) llame a esta API (puerto 3001).
# Sin esto el navegador bloquearía las respuestas por ser otro origen.
CORS(api)
@api.route("/hello", methods=["POST", "GET"])
def handle_hello():

    response_body = {
        "message": "Hello! I'm a message that came from the backend, check the network tab on the google inspector and you will see the GET request"
    }

    return jsonify(response_body), 200


@api.route("/workers", methods=["POST"])
@role_required("manager")
def create_worker():

    data = request.get_json()

    if not data:
        return jsonify({
            "message": "No se han enviado datos"
        }), 400

    email = data.get("email")
    password = data.get("password")
    role = data.get("role")
    shift_id = data.get("shift_id")
    hire_date = data.get("hire_date")
    position = data.get("position")

    if hire_date:
        try:
            hire_date = datetime.strptime(
                hire_date, "%Y-%m-%d"
            ).date()
        except ValueError:
            return jsonify({
                "message": "hire_date debe tener el formato YYYY-MM-DD"
            }), 400

    if not email or not password or not role:
        return jsonify({
            "message": "email, password y role son obligatorios"
        }), 400

    if role != "worker":
        return jsonify({
            "message": "El usuario creado debe tener rol worker"
        }), 400

    existing_user = User.query.filter_by(email=email).first()

    if existing_user:
        return jsonify({
            "message": "Ya existe un usuario con ese email"
        }), 409

    try:
        user = User(
            email=email,
            password=password,
            role="worker",
            is_active=True
        )

        db.session.add(user)
        db.session.flush()

        worker = Worker(
            user_id=user.id,
            shift_id=shift_id,
            hire_date=hire_date,
            position=position,
            is_active=True
        )

        db.session.add(worker)
        db.session.commit()

        return jsonify({
            "message": "Worker creado correctamente",
            "user": user.serialize(),
            "worker_id": worker.worker_id
        }), 201

    except Exception as error:
        db.session.rollback()

        return jsonify({
            "message": "Error al crear el worker",
            "error": str(error)
        }), 500


@api.route("/workers", methods=["GET"])
@role_required("manager")
def get_workers():

    workers = Worker.query.all()

    return jsonify([
        {
            "worker_id": worker.worker_id,
            "user_id": worker.user_id,
            "shift_id": worker.shift_id,
            "hire_date": worker.hire_date.isoformat()
            if worker.hire_date else None,
            "position": worker.position,
            "is_active": worker.is_active
        }
        for worker in workers
    ]), 200


@api.route("/workers/<int:worker_id>", methods=["GET"])
def get_worker(worker_id):

    worker = db.session.get(Worker, worker_id)

    if not worker:
        return jsonify({
            "message": "Worker no encontrado"
        }), 404

    return jsonify({
        "worker_id": worker.worker_id,
        "user_id": worker.user_id,
        "shift_id": worker.shift_id,
        "hire_date": worker.hire_date.isoformat()
        if worker.hire_date else None,
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

    if "shift_id" in data:
        worker.shift_id = data["shift_id"]

    if "hire_date" in data:
        try:
            worker.hire_date = datetime.strptime(
                data["hire_date"], "%Y-%m-%d"
            ).date()
        except ValueError:
            return jsonify({
                "message": "hire_date debe tener el formato YYYY-MM-DD"
            }), 400

    if "position" in data:
        worker.position = data["position"]

    if "is_active" in data:
        worker.is_active = data["is_active"]

    try:
        db.session.commit()

        return jsonify({
            "message": "Worker actualizado correctamente",
            "worker_id": worker.worker_id,
            "user_id": worker.user_id,
            "shift_id": worker.shift_id,
            "hire_date": worker.hire_date.isoformat()
            if worker.hire_date else None,
            "position": worker.position,
            "is_active": worker.is_active
        }), 200

    except Exception as error:
        db.session.rollback()

        return jsonify({
            "message": "Error al actualizar el worker",
            "error": str(error)
        }), 500


@api.route("/workers/<int:worker_id>", methods=["DELETE"])
@role_required("manager")
def delete_worker(worker_id):

    worker = db.session.get(Worker, worker_id)

    if not worker:
        return jsonify({
            "message": "Worker no encontrado"
        }), 404

    try:
        db.session.delete(worker)
        db.session.commit()

        return jsonify({
            "message": "Worker eliminado correctamente"
        }), 200

    except Exception as error:
        db.session.rollback()

        return jsonify({
            "message": "Error al eliminar el worker",
            "error": str(error)
        }), 500
# ----------------------------------------------------------------------
# RUTAS PÚBLICAS
# ----------------------------------------------------------------------

@api.route('/register', methods=['POST'])
def register():
    """Da de alta un usuario nuevo.

    Todas las validaciones se hacen ANTES de tocar la base de datos, y
    cada fallo devuelve su propio código HTTP para que el frontend pueda
    distinguirlos.
    """
    data = request.get_json()

    if not data:
        return jsonify({"message": "No se recibieron datos"}), 400

    name = data.get("name")
    last_name = data.get("last_name")
    phone = data.get("phone")
    email = data.get("email")
    password = data.get("password")

    # .get() devuelve None si la clave no viene, así que esto cubre tanto
    # los campos ausentes como los enviados vacíos.
    if not name or not last_name or not phone or not email or not password:
        return jsonify({"message": "Todos los campos son obligatorios"}), 400

    # "algo@algo.algo", sin espacios ni arrobas de más. No valida que el
    # correo exista de verdad; para eso haría falta un email de
    # confirmación.
    email_pattern = r'^[^@\s]+@[^@\s]+\.[^@\s]+$'

    if not re.match(email_pattern, email):
        return jsonify({"message": "El correo electrónico no es válido"}), 400

    existing_user = db.session.execute(
        db.select(User).where(User.email == email)
    ).scalar_one_or_none()

    # 409 (conflicto), no 400: los datos son correctos, el problema es que
    # chocan con algo que ya existe.
    if existing_user:
        return jsonify({"message": "El correo electrónico ya está registrado"}), 409

    if len(password) < 6:
        return jsonify({"message": "La contraseña debe tener mínimo 6 caracteres"}), 400

    # El rol se fuerza a "client": nadie puede darse de alta como worker o
    # manager desde fuera. Esos los crea el manager desde el dashboard.
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

    # add() lo deja preparado, commit() lo escribe de verdad en la BD.
    db.session.add(new_user)
    db.session.commit()

    return jsonify({
        "message": "Usuario registrado correctamente",
        "user": new_user.serialize()
    }), 201


@api.route('/login', methods=['POST'])
def login():
    """Comprueba las credenciales y devuelve el token de sesión.

    Devuelve también el usuario, para que el frontend conozca el rol
    desde el primer instante y pueda decidir qué pintar sin esperar a
    una segunda petición.
    """
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    existing_user = db.session.execute(db.select(User).where(
        User.email == email)).scalar_one_or_none()

    # Por motivos de seguridad, devolvemos el mismo mensaje de error independientemente 
    # de si falla el correo o la contraseña. Esto previene ataques de enumeración,
    # impidiendo que un tercero sepa si un correo específico está registrado.
    if existing_user is None:
        return jsonify({"error": "Invalid email or password"}), 401

    if existing_user.check_password(password):
        if not existing_user.is_active:
            return jsonify({"error": "Your account is deactivated. Contact the administrator."}), 403
        # El token guarda el user_id (como texto, que es lo que espera la
        # librería). Con ese id se recupera el usuario en cada petición
        # protegida. Caduca solo, sin que haya que guardarlo en ningún sitio.
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

@api.route("/profile", methods=["GET"])
@jwt_required()
def get_profile():
    """Devuelve el usuario del token. Cualquier rol puede pedirlo: solo
    consulta sus propios datos.

    El frontend lo usa para revalidar la sesión al cargar: si responde
    401, el token ya no vale y se cierra la sesión.
    """
    # No se recibe el id por parámetro, se saca del token: así nadie puede
    # pedir el perfil de otro cambiando la URL.
    user_id = get_jwt_identity()
    user = db.session.get(User, user_id)

    # El token era válido pero el usuario ya no está (lo borraron mientras
    # tenía la sesión abierta).
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Misma forma que /login ({"user": ...}) para que el frontend lea
    # siempre data.user, venga de donde venga.
    return jsonify({"user": user.serialize_session()}), 200


# ----------------------------------------------------------------------
# NOTA PARA EL EQUIPO: "RUTAS CON PERMISO POR ROL"
#
# Este es el patrón a seguir en TODAS las rutas protegidas del dashboard.
#
# @role_required(...) recibe los roles que pueden entrar, y se cambia
# según a quién pertenezca la sección:
#
#     @role_required("manager")             -> solo encargados
#     @role_required("worker")              -> solo trabajadores
#     @role_required("client")              -> solo clientes
#     @role_required("manager", "worker")   -> varios roles a la vez
#
# Ya comprueba el token por dentro, así que NO hay que añadirle
# @jwt_required() encima. Si el rol no encaja, responde 403.
#
# Importante: los guardianes del frontend (RoleRoute, el sidebar filtrado)
# solo evitan que alguien acabe donde no debe. Cualquiera puede editar su
# rol en el navegador; lo único que de verdad protege los datos es este
# decorador. Toda ruta del dashboard necesita el suyo.
# ----------------------------------------------------------------------


# ----------------------------------------------------------------------
# CATÁLOGO DE TAREAS (ENCARGADO)
#
# El catálogo compartido: limpiar cristales, hacer plancha... Solo lo
# gestiona el encargado. La lista pública, sin las desactivadas, es de la
# issue #36.
#
#   GET    /api/manage/tasks          todas, activas y desactivadas
#   POST   /api/tasks                 crear
#   PUT    /api/tasks/<id>            editar nombre y descripción
#   PATCH  /api/tasks/<id>/status     activar o desactivar
#
# No hay DELETE: una tarea borrada dejaría reservas apuntando a la nada.
# ----------------------------------------------------------------------

# Mismo tope que la columna task_name en models.py.
TASK_NAME_MAX_LENGTH = 100


def get_json_body():
    """Devuelve el cuerpo JSON si es un objeto, o None.

    silent=True: con un cuerpo vacío o que no es JSON no lanza, devuelve
    None. Y un JSON que no es objeto ([] o "texto") tampoco sirve, porque
    luego se le piden claves con .get().
    """
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else None


def clean_task_name(raw_name):
    """Devuelve (nombre, None) si vale, o (None, mensaje) si no."""
    if not isinstance(raw_name, str) or not raw_name.strip():
        return None, "El nombre de la tarea es obligatorio"

    name = raw_name.strip()

    if len(name) > TASK_NAME_MAX_LENGTH:
        return None, f"El nombre no puede superar los {TASK_NAME_MAX_LENGTH} caracteres"

    return name, None


def task_name_taken(name, exclude_task_id=None):
    """Indica si ya hay otra tarea con ese nombre, sin mirar mayúsculas.

    La restricción unique de la base de datos SÍ distingue mayúsculas: por
    ella sola entrarían "Limpiar cristales" y "limpiar cristales". Por eso
    se comprueba aquí, comparando los dos en minúsculas.

    exclude_task_id: al editar, la propia tarea no cuenta. Sin esto,
    guardarla sin cambiarle el nombre daría "ya existe".
    """
    query = db.select(Task).where(func.lower(Task.task_name) == name.lower())

    if exclude_task_id is not None:
        query = query.where(Task.task_id != exclude_task_id)

    return db.session.execute(query).scalar_one_or_none() is not None


def clean_description(raw_description):
    """Devuelve (descripción, None) si vale, o (None, mensaje) si no.

    Vacía o ausente se guarda como NULL y no como texto vacío: así "sin
    descripción" solo se representa de una forma.
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

    # Primero se valida TODO y después se escribe: si algo falla, la base
    # de datos no llega a enterarse.
    name, error = clean_task_name(data.get("task_name"))
    if error:
        return jsonify({"message": error}), 400

    description, error = clean_description(data.get("description"))
    if error:
        return jsonify({"message": error}), 400

    is_active = data.get("is_active", True)

    # isinstance y no un simple `if`: el texto "false" es verdadero en
    # Python, y colaría una tarea activa sin que nadie lo pidiera.
    if not isinstance(is_active, bool):
        return jsonify({"message": "is_active debe ser true o false"}), 400

    # 409 y no 400, igual que el email repetido en /register: los datos
    # están bien, el problema es que chocan con algo que ya existe.
    if task_name_taken(name):
        return jsonify({"message": "Ya existe una tarea con ese nombre"}), 409

    task = Task(task_name=name, description=description, is_active=is_active)
    db.session.add(task)

    try:
        db.session.commit()
    except IntegrityError:
        # Dos altas casi a la vez con el mismo nombre: la comprobación de
        # arriba no llega a verlo, pero la base de datos sí.
        db.session.rollback()
        return jsonify({"message": "Ya existe una tarea con ese nombre"}), 409

    return jsonify({"task": task.serialize()}), 201


@api.route("/tasks/<int:task_id>", methods=["PUT"])
@role_required("manager")
def update_task(task_id):
    """Edita el nombre y la descripción.

    Solo cambia lo que venga en el cuerpo. El estado NO se toca aquí: va
    por su propia ruta, para que editar un texto nunca desactive una
    tarea por error.
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
    """Activa o desactiva una tarea. Es lo que sustituye al borrado."""
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
#
# Los tipos de limpieza: esencial, integral, profunda, fin de obra...
# Solo los gestiona el encargado. La lista pública, sin los desactivados,
# es de la issue #36.
#
#   GET    /api/manage/services       todos, activos y desactivados
# ----------------------------------------------------------------------

@api.route("/manage/services", methods=["GET"])
@role_required("manager")
def get_all_services():
    """Todos los servicios, activos y desactivados, con todos sus campos.

    serialize() y no serialize_public(): el encargado necesita ver también
    el id y el estado, que la vista pública esconde.
    """
    services = db.session.execute(
        db.select(Service).order_by(Service.service_id)
    ).scalars().all()

    return jsonify({"services": [service.serialize() for service in services]}), 200