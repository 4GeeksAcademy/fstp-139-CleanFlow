"""
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
"""
from flask import Flask, request, jsonify, url_for, Blueprint
from api.models import db, User, Service, ServiceTask
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


def validar_duraciones(default_min, min_min, max_min):
    for label, value in [("default_duration_minutes", default_min), ("min_duration_minutes", min_min), ("max_duration_minutes", max_min)]:
        if value % 30 != 0:
            return f"{label} debe ser múltiplo de 30"
    if not (min_min <= default_min <= max_min):
        return "Debe cumplirse: min_duration_minutes <= default_duration_minutes <= max_duration_minutes"
    return None


@api.route('/services', methods=['GET'])
def get_services():
    only_active = request.args.get('is_active')
    query = Service.query
    if only_active == 'true':
        query = query.filter_by(is_active=True)
    services = query.all()
    return jsonify([s.serialize() for s in services]), 200


@api.route('/services/<int:service_id>', methods=['GET'])
def get_service(service_id):
    service = Service.query.get_or_404(service_id)
    return jsonify(service.serialize()), 200


@api.route('/services', methods=['POST'])
def create_service():
    data = request.get_json()
    required = ['name', 'base_hourly_rate', 'default_duration_minutes', 'min_duration_minutes', 'max_duration_minutes']
    if not all(field in data for field in required):
        return jsonify({"error": f"Faltan campos requeridos: {required}"}), 400

    error = validar_duraciones(data['default_duration_minutes'], data['min_duration_minutes'], data['max_duration_minutes'])
    if error:
        return jsonify({"error": error}), 400

    service = Service(
        name=data['name'],
        description=data.get('description'),
        base_hourly_rate=data['base_hourly_rate'],
        default_duration_minutes=data['default_duration_minutes'],
        min_duration_minutes=data['min_duration_minutes'],
        max_duration_minutes=data['max_duration_minutes'],
        is_active=data.get('is_active', True),
    )
    db.session.add(service)
    db.session.flush()  # para tener service.service_id antes del commit

    # checklist opcional al crear: data["tasks"] = [{"name": "...", "description": "...", "estimated_minutes": 10, "is_required": true}, ...]
    for task_data in data.get('tasks', []):
        task = ServiceTask(
            service_id=service.service_id,
            name=task_data['name'],
            description=task_data.get('description'),
            estimated_minutes=task_data.get('estimated_minutes'),
            is_required=task_data.get('is_required', True),
        )
        db.session.add(task)

    db.session.commit()
    return jsonify(service.serialize()), 201


@api.route('/services/<int:service_id>', methods=['PUT'])
def update_service(service_id):
    service = Service.query.get_or_404(service_id)
    data = request.get_json()

    new_default = data.get('default_duration_minutes', service.default_duration_minutes)
    new_min = data.get('min_duration_minutes', service.min_duration_minutes)
    new_max = data.get('max_duration_minutes', service.max_duration_minutes)
    error = validar_duraciones(new_default, new_min, new_max)
    if error:
        return jsonify({"error": error}), 400

    if 'name' in data:
        service.name = data['name']
    if 'description' in data:
        service.description = data['description']
    if 'base_hourly_rate' in data:
        service.base_hourly_rate = data['base_hourly_rate']
    service.default_duration_minutes = new_default
    service.min_duration_minutes = new_min
    service.max_duration_minutes = new_max
    if 'is_active' in data:
        service.is_active = data['is_active']

    db.session.commit()
    return jsonify(service.serialize()), 200


@api.route('/services/<int:service_id>', methods=['DELETE'])
def deactivate_service(service_id):
    # Soft delete: nunca se borra de verdad, para no romper el histórico de reservas
    service = Service.query.get_or_404(service_id)
    service.is_active = False
    db.session.commit()
    return jsonify({"message": "Servicio desactivado", "service": service.serialize()}), 200


@api.route('/services/<int:service_id>/tasks', methods=['GET'])
def get_service_tasks(service_id):
    Service.query.get_or_404(service_id)  # 404 si el servicio no existe
    tasks = ServiceTask.query.filter_by(service_id=service_id).all()
    return jsonify([t.serialize() for t in tasks]), 200


@api.route('/services/<int:service_id>/tasks', methods=['POST'])
def add_service_task(service_id):
    Service.query.get_or_404(service_id)
    data = request.get_json()
    if 'name' not in data:
        return jsonify({"error": "El campo 'name' es requerido"}), 400

    task = ServiceTask(
        service_id=service_id,
        name=data['name'],
        description=data.get('description'),
        estimated_minutes=data.get('estimated_minutes'),
        is_required=data.get('is_required', True),
    )
    db.session.add(task)
    db.session.commit()
    return jsonify(task.serialize()), 201


@api.route('/services/<int:service_id>/tasks/<int:task_id>', methods=['PUT'])
def update_service_task(service_id, task_id):
    task = ServiceTask.query.filter_by(service_id=service_id, service_task_id=task_id).first_or_404()
    data = request.get_json()

    if 'name' in data:
        task.name = data['name']
    if 'description' in data:
        task.description = data['description']
    if 'estimated_minutes' in data:
        task.estimated_minutes = data['estimated_minutes']
    if 'is_required' in data:
        task.is_required = data['is_required']

    db.session.commit()
    return jsonify(task.serialize()), 200


@api.route('/services/<int:service_id>/tasks/<int:task_id>', methods=['DELETE'])
def delete_service_task(service_id, task_id):
    task = ServiceTask.query.filter_by(service_id=service_id, service_task_id=task_id).first_or_404()
    db.session.delete(task)
    db.session.commit()
    return jsonify({"message": "Tarea eliminada"}), 200