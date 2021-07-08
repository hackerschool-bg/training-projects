import json
import os
import logging
import pathlib

import jsonschema

from pachu.err import assertSystem, PeerError
from pachu.config import config

stdout_logger = logging.getLogger('stdout')
protocol_formats = {
    'jsonrpc': 'json',
    'yamlrpc': 'yaml'
}
supported_protocols = list(protocol_formats.keys())


def compile_schemas_under_tree(dir_path):
    dir_path = pathlib.Path(dir_path)
    _, dnames, fnames = next(os.walk(str(dir_path)))
    msg = 'directory {} contains both files and directories.'.format(fnames)

    assertSystem(not (fnames and dnames), msg=msg)

    if dnames:
        stdout_logger.debug('Searching for schemas in directories %s',
                           [dir_path / dn for dn in dnames])

        return {dn: compile_schemas_under_tree(dir_path / dn)
                for dn in dnames}
    else:
        stdout_logger.info('Compiling schemas under directory %s', dir_path)
        schemas = {}

        for fn in fnames:
            path = dir_path / fn

            stdout_logger.info('Compiling schema %s at path %s', path.stem, path)

            schemas[path.stem] = json.loads(path.read_text(encoding='utf-8'))


        return schemas


compiled_schemas = compile_schemas_under_tree(
    config['resources']['schemas-tree']
)


def validate_request_through_protocol(request_body, protocol):
    jsonschema.validate(request_body, compiled_schemas['requests'][protocol])


def validate_request_of_method(request_body, method):
    try:
        jsonschema.validate(request_body, compiled_schemas['requests'][method])
    except jsonschema.ValidationError as e:
        raise PeerError(msg=e.message,
                        code='API_BAD_METHOD_PARAMS')
