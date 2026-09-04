"""
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
"""

from functools import wraps
from datetime import datetime

from flask import request, jsonify, Blueprint
from flask_cors import CORS
from flask_jwt_extended import jwt_required, get_jwt

from api.models import db, User, Worker


api = Blueprint("api", __name__)

# Allow CORS requests to this API
CORS(api)


def required_role(role):
    """
    Decorator that allows access to a route only to users
    with the specified role.
    """

    def decorator(function):
        @wraps(function)
        @jwt_required()
        def wrapper(*args, **kwargs):

            claims = get_jwt()

            if claims.get("role") != role:
                return jsonify({
                    "message": f"Se requiere el rol {role}"
                }), 403

            return function(*args, **kwargs)

        return wrapper

    return decorator


@api.route("/hello", methods=["POST", "GET"])
def handle_hello():

    response_body = {
        "message": "Hello! I'm a message that came from the backend, check the network tab on the google inspector and you will see the GET request"
    }

    return jsonify(response_body), 200


@api.route("/workers", methods=["POST"])
@required_role("manager")
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
@required_role("manager")
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
@required_role("manager")
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
@required_role("manager")
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