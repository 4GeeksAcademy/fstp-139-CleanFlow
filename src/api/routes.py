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
from api.models import db, User
from api.utils import generate_sitemap, APIException, role_required
from flask_cors import CORS
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from flask_bcrypt import generate_password_hash

api = Blueprint('api', __name__)

# Permite que el frontend (puerto 3000) llame a esta API (puerto 3001).
# Sin esto el navegador bloquearía las respuestas por ser otro origen.
CORS(api)


@api.route('/hello', methods=['POST', 'GET'])
def handle_hello():

    response_body = {
        "message": "Hello! I'm a message that came from the backend, check the network tab on the google inspector and you will see the GET request"
    }

    return jsonify(response_body), 200


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

# Endpoint de prueba, para verificar que @role_required funciona. Cuando
# alguien construya /workers de verdad, sustituye este bloque manteniendo
# el decorador.
@api.route("/workers", methods=["GET"])
@role_required("manager")
def get_workers():
    return jsonify({"message": "Solo un manager puede ver esto"}), 200
