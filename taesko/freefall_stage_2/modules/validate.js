const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const ajv = new Ajv();
const { assertApp, assertPeer, AppError } = require('./error-handling');
const { log } = require('./utils');

const PROTOCOLS = ['jsonrpc'];
const METHODS = ['search', 'subscribe', 'unsubscribe', 'senderror'];
const SCHEMAS_DIR = path.join(__dirname, '..', 'api_schemas');

const FORMATS = {
  'text/json': 'json',
  'application/json': 'json',
  'text/yaml': 'yaml',
};

function getApiSchema (method, type = 'request') {
  const typeDirs = {
    'request': 'requests',
    'response': 'responses',
  };
  const schemaPath = path.join(SCHEMAS_DIR, typeDirs[type], `${method}.json`);

  assertApp(
    fs.existsSync(schemaPath),
    `Missing schema ${method}`,
  );

  return JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
}

function getFullSchemaName (method, type) {
  type = type.toLowerCase();
  assertApp(
    METHODS.indexOf(method) !== -1 ||
    PROTOCOLS.indexOf(method) !== -1 ||
    method === 'error',
    `there is no such method ${method}`,
  );
  assertApp(type === 'request' || type === 'response',
    `invalid type=${type} parameter - must be one of ['request', 'response']`,
  );

  return `${type}/${method}`;
}

// alternatives - init function
(function registerSchemas () {
  const schemas = {};

  for (const type of ['request', 'response']) {
    for (const shortName of METHODS.concat(PROTOCOLS)) {
      const name = getFullSchemaName(shortName, type);
      schemas[name] = getApiSchema(shortName, type);
    }
  }

  const err = getFullSchemaName('error', 'response');
  schemas[err] = getApiSchema('error', 'response');

  for (const [name, schema] of Object.entries(schemas)) {
    try {
      ajv.addSchema(schema, name);
      log(`Registered schema with name=${name}`);
    } catch (e) {
      throw new AppError(`Cannot add ${name} schema to ajv. Reason: ${e}`);
    }
  }
})();

function validateProtocol (obj, protocol = 'jsonrpc', type = 'request') {
  assertApp(PROTOCOLS.indexOf(protocol) !== -1,
    `Cannot validate protocol - ${protocol} is unknown`,
  );

  if (type === 'request') {
    assertPeer(
      ajv.validate(`request/${protocol}`, obj),
      `Bad protocol. Error: ${ajv.errorsText()}`,
    );
  } else if (type === 'response') {
    assertApp(
      ajv.validate(`response/${protocol}`, obj),
      `Bad response. Error: ${ajv.errorsText()}`,
    );
  } else {
    assertApp(false, `Invalid parameter type=${type}`);
  }
}

function validateRequest (requestBody, protocol = 'jsonrpc') {
  validateProtocol(requestBody, protocol, 'request');

  const method = requestBody.method;
  const apiParams = requestBody.params;
  const schemaName = getFullSchemaName(method, 'request');

  assertPeer(METHODS.indexOf(method) !== -1, `Method not supported - ${method}`);
  log('using schema', schemaName, 'to validate method', method);
  assertPeer(ajv.validate(schemaName, apiParams),
    `Invalid params for method ${method}. Error: ${ajv.errorsText()}`,
  );
  log('validated method', method, 'with params', apiParams);
}

function validateRequestFormat ({ headerParam, queryParam }) {
  const headerFormat = FORMATS[headerParam];
  const queryFormat = FORMATS[queryParam];
  assertPeer(
    headerFormat || queryFormat,
    `neither of header parameter ${headerParam} and query parameter ${queryParam} are valid format parameters`,
  );
  assertPeer(
    !(
      headerFormat && queryFormat &&
      headerFormat.toLowerCase() === queryFormat.toLowerCase()
    ),
    `header param ${headerParam} and query param ${queryParam} have different values.`,
  );

  return headerFormat || queryFormat;
}

function validateResponse (responseBody, method, protocol = 'jsonrpc') {
  assertApp(
    METHODS.indexOf(method) !== -1,
    `Tried to validate an unknown method=${method}`,
  );

  log('validating method', method, 'with response: ', responseBody);
  validateProtocol(responseBody, protocol, 'response');

  if (responseBody.error) {
    assertApp(
      ajv.validate(getFullSchemaName('error', 'response'), responseBody.error),
      `invalid error response for method ${method}. Error: ${ajv.errorsText()}`,
    );
  } else {
    assertApp(
      ajv.validate(getFullSchemaName(method, 'response'), responseBody.result),
      `invalid result in response for method ${method}. Error: ${ajv.errorsText()}`,
    );
  }
}

module.exports = {
  validateRequest,
  validateResponse,
  validateRequestFormat,
};
