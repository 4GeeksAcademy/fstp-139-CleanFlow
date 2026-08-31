"""
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
"""
from flask import Flask, request, jsonify, url_for, Blueprint
from api.models import db, User
from api.utils import generate_sitemap, APIException
from flask_cors import CORS
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from flask_bcrypt import generate_password_hash

api = Blueprint('api', __name__)

# Allow CORS requests to this API
CORS(api)


@api.route('/hello', methods=['POST', 'GET'])
def handle_hello():

    response_body = {
        "message": "Hello! I'm a message that came from the backend, check the network tab on the google inspector and you will see the GET request"
    }

    return jsonify(response_body), 200


@api.route('/register', methods=['POST'])
def register():
    data = request.get_json()

    if not data:
        return jsonify({"message": "No se recibieron datos"}), 400

    name = data.get("name")
    last_name = data.get("last_name")
    phone = data.get("phone")
    email = data.get("email")
    password = data.get("password")

    if not name or not last_name or not phone or not email or not password:
        return jsonify({"message": "Todos los campos son obligatorios"}), 400

    email_pattern = r'^[^@\s]+@[^@\s]+\.[^@\s]+$'

    if not re.match(email_pattern, email):
     return jsonify({"message": "El correo electrónico no es válido"}), 400

    existing_user = db.session.execute(
        db.select(User).where(User.email == email)
    ).scalar_one_or_none()

    if existing_user:
        return jsonify({"message": "El correo electrónico ya está registrado"}), 409

    if len(password) < 6:
        return jsonify({"message": "La contraseña debe tener mínimo 6 caracteres"}), 400

    hashed_password = generate_password_hash(password)

    new_user = User(
        name=name,
        last_name=last_name,
        phone=phone,
        email=email,
        password=hashed_password,
        role="client",
        is_active=True
    )

    db.session.add(new_user)
    db.session.commit()

    return jsonify({
        "message": "Usuario registrado correctamente",
        "user": new_user.serialize()
    }), 201

@api.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = date.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    existing_user = db.session.execute(db.select(User).where(
        User.email == email)).scalar_one_or_none

    if existing_user is None:
        return jsonify({"error": "Invalid email or password"}), 401

    if existing_user.check_password(password):
        access_token = create_access_token(identity=str(existing_user.id))
        return jsonify({"msg": "Logged succefully", "token": access_token}), 200
    else:
        return jsonify({"error": "Invalid email or password"}), 401 
        
@api.route("/dashboard", methods=["GET"])
@jwt_required()
def get_profile():
    user_id = get_jwt_identity()
    user = db.session.get(User, user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404
    
    return jsonify(user.serialize()), 200

