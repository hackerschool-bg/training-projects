const { assertApp } = require('./error-handling');

function normalizeRequest (requestObject) {
  if (Object.hasOwnProperty(requestObject, 'yamlrpc')) {
    return {
      jsonrpc: requestObject.yamlrpc,
      method: requestObject.action,
      params: requestObject.parameters,
      id: requestObject.id,
    };
  } else {
    return Object.assign({}, requestObject);
  }
}

function buildRPCResponse ({ protocol, version, resultObject, id }) {
  assertApp(
    protocol != null && version != null &&
    resultObject != null && id !== undefined,
    'all arguments to buildRPCResponse are required.',
  );
  if (protocol === 'jsonrpc') {
    return {
      jsonrpc: version,
      result: resultObject,
      id,
    };
  } else if (protocol === 'yamlrpc') {
    return {
      yamlrpc: version,
      result: resultObject,
      id,
    };
  } else {
    assertApp(false, `unknown protocol ${protocol}`);
  }
}

function buildRPCErrorResponse ({
  protocol,
  version,
  errorObject,
  id,
  code,
  message,
}) {
  assertApp(
    protocol != null && version != null &&
    errorObject != null && id !== undefined &&
    code != null && message != null,
    'all arguments to buildRPCErrorResponse are required.',
  );
  if (protocol === 'jsonrpc') {
    return {
      jsonrpc: version,
      error: {
        code,
        message,
        data: errorObject,
      },
      id,
    };
  } else if (protocol === 'yamlrpc') {
    return {
      yamlrpc: version,
      error: {
        code,
        message,
        data: errorObject,
      },
      id,
    };
  } else {
    assertApp(false, `unknown protocol ${protocol}`);
  }
}

module.exports = {
  buildRPCResponse,
  buildRPCErrorResponse,
  normalizeRequest,
};
