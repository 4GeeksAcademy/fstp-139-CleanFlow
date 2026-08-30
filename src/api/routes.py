"""
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
"""
from datetime import datetime
from flask import Flask, request, jsonify, url_for, Blueprint
from api.models import db, User, Shift
from api.utils import generate_sitemap, APIException
from flask_cors import CORS

api = Blueprint('api', __name__)

# Allow CORS requests to this API
CORS(api)


@api.route('/hello', methods=['POST', 'GET'])
def handle_hello():

    response_body = {
        "message": "Hello! I'm a message that came from the backend, check the network tab on the google inspector and you will see the GET request"
    }

    return jsonify(response_body), 200


@api.route('/shifts', methods=['GET'])
def get_shifts():
    shifts = Shift.query.all()
    return jsonify([s.serialize() for s in shifts]), 200


@api.route('/shifts', methods=['POST'])
def create_shift():
    data = request.get_json()
    required = ['name', 'start_time', 'end_time']
    if not all(field in data for field in required):
        return jsonify({"error": "Faltan campos: name, start_time, end_time"}), 400

    try:
        start = datetime.strptime(data['start_time'], "%H:%M").time()
        end = datetime.strptime(data['end_time'], "%H:%M").time()
    except ValueError:
        return jsonify({"error": "Formato de hora inválido, usa HH:MM"}), 400

    shift = Shift(name=data['name'], start_time=start, end_time=end)
    db.session.add(shift)
    db.session.commit()
    return jsonify(shift.serialize()), 201


@api.route('/shifts/<int:shift_id>', methods=['PUT'])
def update_shift(shift_id):
    shift = Shift.query.get_or_404(shift_id)
    data = request.get_json()

    if 'name' in data:
        shift.name = data['name']
    if 'start_time' in data:
        shift.start_time = datetime.strptime(data['start_time'], "%H:%M").time()
    if 'end_time' in data:
        shift.end_time = datetime.strptime(data['end_time'], "%H:%M").time()

    db.session.commit()
    return jsonify(shift.serialize()), 200


@api.route('/shifts/<int:shift_id>', methods=['DELETE'])
def delete_shift(shift_id):
    shift = Shift.query.get_or_404(shift_id)

    # TODO: cuando exista el modelo Worker, validar que no tenga trabajadores activos asignados antes de borrar

    db.session.delete(shift)
    db.session.commit()
    return jsonify({"message": "Turno eliminado"}), 200