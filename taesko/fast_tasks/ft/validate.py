import collections
import functools
import json
import os
import logging


import jsonschema
import jsonschema.exceptions
from flask import request

from ft.err import PeerError, UserError

SCHEMA_DIRECTORY = 'ft/schemas'
logger = logging.getLogger(__name__)


class SchemaRegistry(collections.UserDict):
    @classmethod
    def from_directory(cls, root):
        dct = cls()

        for dir_path, dir_names, file_names in os.walk(root):
            schema_path = os.path.join(dir_path, file_names)
            schema_id = os.path.relpath(root, schema_path)
            compiled = json.loads(schema_id, encoding='utf-8')
            dct[schema_id] = compiled

        return dct


SCHEMAS = SchemaRegistry.from_directory(SCHEMA_DIRECTORY)


def validate_uri_query(method, uri, query):
    try:
        schema = SchemaRegistry[uri][method]['query']
    except KeyError:
        return

    try:
        jsonschema.validate(query, schema, format_checker=jsonschema.FormatChecker())
    except jsonschema.exceptions.ValidationError as e:
        if e.cause:
            msg = 'Invalid data for query {query} on resource {method.upper()} {uri}'
            err = UserError(userMsg=e.message, code='INVALID_QUERY_DATA')
        else:
            msg = 'Invalid object schema for query {query} on resource {method.upper()} {uri}'
            err = PeerError(userMsg=e.message, code='INVALID_QUERY_SCHEMA')
        logger.exception(msg.format(**locals()))
        raise err


def validate_request_body(method, uri, body):
    try:
        schema = SchemaRegistry[uri][method]['request-body']
    except KeyError:
        return

    try:
        jsonschema.validate(body, schema, format_checker=jsonschema.FormatChecker())
    except jsonschema.exceptions.ValidationError as e:
        if e.cause:
            msg = 'Invalid data for body {body} on request to resource {method.upper()} {uri}'
            err = UserError(userMsg=e.message, code='INVALID_BODY_DATA')
        else:
            msg = 'Invalid object schema for body {body} on request to resource {method.upper()} {uri}'
            err = PeerError(userMsg=e.message, code='INVALID_BODY_SCHEMA')
        logger.exception(msg.format(**locals()))
        raise err

def validate_response_body(method, uri, body):
    try:
        schema = SchemaRegistry[uri][method]['response-body']
    except KeyError:
        return

    try:
        jsonschema.validate(body, schema, format_checker=jsonschema.FormatChecker())
    except jsonschema.exceptions.ValidationError as e:
        if e.cause:
            msg = 'Invalid data for body {body} on response to resource {method.upper()} {uri}'
            err = UserError(userMsg=e.message, code='INVALID_BODY_DATA')
        else:
            msg = 'Invalid object schema for body {body} on response to resource {method.upper()} {uri}'
            err = PeerError(userMsg=e.message, code='INVALID_BODY_SCHEMA')
        logger.exception(msg.format(**locals()))
        raise err

def validate_resource_request(route_function):
    @functools.wraps(route_function)
    def decorated_route(*args, **kwargs):
        method = request.method
        path = request.path
        validate_uri_query(method, path, dict(request.args))
        validate_request_body(method, path, dict(request.get_json(cache=True)))
        return route_function(*args, **kwargs)

