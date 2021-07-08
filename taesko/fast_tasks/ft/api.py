import importlib
import json
import logging
import pkgutil

from flask import Blueprint, request

import ft.tasks

API = Blueprint('api', __name__)


logger = logging.getLogger(__name__)


# @API.before_request
# def validate_resources():
#     method = request.method
#     path = request.path
#     validate_uri_query(method, path, dict(request.args))
#     validate_request_body(method, path, dict(request.get_json(cache=True)))


@API.route('/tasks/')
def tasks():
    no_sub_packages = all(is_pkg is False for _, _, is_pkg in pkgutil.iter_modules(ft.tasks.__path__))
    assert no_sub_packages, 'tasks package has a sub package inside it.'

    fast_tasks = [name for _, name, _ in pkgutil.iter_modules(ft.tasks.__path__)]

    return json.dumps(dict(names=fast_tasks))


@API.route('/tasks/<task_name>', methods=['POST'])
def process_task_input(task_name):
    raw_input = request.get_json()

    arguments = raw_input['arguments']

    module = importlib.import_module('.'.join(['ft', 'tasks', task_name]))

    result = module.run(**arguments)

    return json.dumps(result)
