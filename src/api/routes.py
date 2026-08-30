"""
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
"""
from flask import Flask, request, jsonify, url_for, Blueprint
from api.models import db, User, Worker
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


@api.route('/workers', methods=['GET'])
def get_workers():
    workers = Worker.query.all()
    return jsonify([w.serialize() for w in workers]), 200


@api.route('/workers/<int:worker_id>', methods=['PUT'])
def update_worker(worker_id):
    worker = Worker.query.get_or_404(worker_id)
    data = request.get_json()

    if 'position' in data:
        worker.position = data['position']
    if 'shift_id' in data:
        worker.shift_id = data['shift_id']
    if 'is_active' in data:
        worker.is_active = data['is_active']

    db.session.commit()
    return jsonify(worker.serialize()), 200