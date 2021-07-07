'use strict';

function main () {
  function BaseError (messages, shouldSend) {
    Error.call(this, messages.msg);

    this.userMessage = messages.userMessage;
    this.msg = messages.msg;

    shouldSend &&
    sendError({
      msg: messages.msg,
      trace: traceLog,
    }, 'jsonrpc');

    handleError(messages, 'error');
  }

  // BaseError.prototype = Object.create(Error.prototype);
  // BaseError.prototype.constructor = BaseError;

  function ApplicationError (messages) {
    BaseError.call(this, messages, true);
  }

  // ApplicationError.prototype = Object.create(BaseError.prototype);
  // ApplicationError.prototype.constructor = ApplicationError;

  function PeerError (messages) {
    BaseError.call(this, messages, true);
  }

  // PeerError.prototype = Object.create(BaseError.prototype);
  // PeerError.prototype.constructor = PeerError;

  function UserError (messages) {
    BaseError.call(this, messages, true);
  }

  function inherit (childClass, parentClass) {
    childClass.prototype = Object.create(parentClass.prototype);
    childClass.prototype.constructor = childClass;
  }

  inherit(BaseError, Error);
  inherit(ApplicationError, BaseError);
  inherit(PeerError, BaseError);
  inherit(UserError, BaseError);

  // UserError.prototype = Object.create(BaseError.prototype);
  // UserError.prototype.constructor = UserError;

  function assertApp (condition, errorParams) {
    if (!condition) {
      throw new ApplicationError(errorParams);
    }
  }

  function assertPeer (condition, errorParams) {
    if (!condition) {
      throw new PeerError(errorParams);
    }
  }

  function assertUser (condition, errorParams) {
    if (!condition) {
      throw new UserError(errorParams);
    }
  }

  function idGenerator () {
    var requestId = 1; // eslint-disable-line no-var

    return function () {
      return requestId++;
    };
  }

  const SERVER_URL = '/';
  // const SERVER_URL = 'http://127.0.0.1:3000';
  const MAX_TRACE = 300;
  var $messageBar; // eslint-disable-line no-var
  const messagesQueue = [];
  const validateSendErrorReq = validators.getValidateSendErrorReq();
  const validateSendErrorRes = validators.getValidateSendErrorRes();
  const validateErrorRes = validators.getValidateErrorRes();
  const validateListAirportsRes = validators.getValidateListAirportsRes();
  const traceLog = [];

  const getParser = defineParsers([jsonParser, yamlParser]);
  const getId = idGenerator();

  function trace (msg) {
    if (traceLog.length > MAX_TRACE) {
      traceLog.shift();
    }
    traceLog.push(msg);
  }

  (function setupErrorMessages () {
    setInterval(function () { // eslint-disable-line prefer-arrow-callback
      if (!$messageBar) {
        return;
      }

      if (messagesQueue.length !== 0) {
        const message = messagesQueue.shift();
        $messageBar.text(message.msg);

        const msgTypeToClassMap = {
          'info': 'info-msg',
          'error': 'error-msg',
          'success': 'success-msg',
        };

        $messageBar.removeClass().addClass(msgTypeToClassMap[message.type]);
      } else {
        $messageBar.text('');
      }
    },
    5000);
  })();

  function displayUserMessage (msg, type = 'info') {
    const allowedMsgTypes = ['info', 'error', 'success'];

    assertApp(
      typeof type === 'string' &&
      allowedMsgTypes.indexOf(type) !== -1,
      'Invalid message type "' + type + '"' // eslint-disable-line prefer-template
    );

    messagesQueue.push({
      msg: msg,
      type: type || 'info',
    });
  }

  function sendError (params, protocolName) {
    assertApp(validateSendErrorReq(params), {
      msg: 'Params do not adhere to sendErrorRequestSchema',
    });

    sendRequest({
      url: SERVER_URL,
      data: {
        method: 'senderror',
        params: params,
      },
      protocolName: protocolName,
    }, function (result, error) { // eslint-disable-line prefer-arrow-callback
      assertPeer(validateSendErrorRes(result), {
        msg: 'Params do not adhere to sendErrorResponseSchema',
      });
    });
  }

  function sendRequest (requestData, callback) {
    var url = requestData.url; // eslint-disable-line no-var
    var data = requestData.data; // eslint-disable-line no-var
    var protocolName = requestData.protocolName; // eslint-disable-line no-var
    var xhr = new window.XMLHttpRequest(); // eslint-disable-line no-var
    var parser = getParser(protocolName); // eslint-disable-line no-var

    xhr.onreadystatechange = function () { // eslint-disable-line prefer-arrow-callback
      if (xhr.readyState === window.XMLHttpRequest.DONE) {
        if (xhr.status === 200) {
          const responseParsed = parser.parseResponse(xhr.responseText);
          callback(responseParsed.result || null, responseParsed.error || null); // TODO handle error;
        } else if (xhr.status !== 204) {
          handleError({
            userMessage: 'Service is not available at the moment due to network issues',
          });
        }
      }
    };

    xhr.open('POST', url);
    xhr.setRequestHeader('Content-Type', parser.contentType);
    xhr.send(parser.stringifyRequest(data, getId()));
  }

  function listAirports (protocolName, callback) {
    trace('listAirports(' + protocolName + '), typeof arg=' + typeof protocolName + ''); // eslint-disable-line prefer-template

    sendRequest({
      url: SERVER_URL,
      data: {
        method: 'list_airports',
        params: {
          v: '2.0',
        },
      },
      protocolName: protocolName,
    }, function (result, error) { // eslint-disable-line prefer-arrow-callback
      if (error) {
        assertPeer(validateErrorRes(error), {
          msg: 'Params do not adhere to errorResponseSchema',
        });

        trace('Error in listAirports:' + JSON.stringify(error)); // eslint-disable-line prefer-template
        throw new PeerError({
          msg: error.message,
        });
      }

      assertPeer(validateListAirportsRes(result), {
        msg: 'Params do not adhere to listAirportsResponseSchema',
      });

      callback(result);
    });
  }

  function yamlParser () {
    const parseYAML = function (yaml) {
      try {
        return jsyaml.safeLoad(yaml);
      } catch (error) {
        throw new PeerError({
          msg: 'Invalid yamlrpc format. Cannot parse YAML.',
        });
      }
    };

    const normalizeYAMLRequest = function (yaml) {
      assertPeer(
        _.isObject(yaml) &&
        _.isObject(yaml.parameters) &&
        typeof yaml.yamlrpc === 'string' &&
        typeof yaml.action === 'string', {
          msg: 'Invalid yamlrpc request format.',
        }
      );

      return {
        yamlrpc: yaml.yamlrpc,
        method: yaml.action,
        params: yaml.parameters,
        id: yaml.id,
      };
    };

    const normalizeYAMLResponse = function (yaml) {
      assertPeer(
        _.isObject(yaml) &&
        (
          (!_.isObject(yaml.result) && _.isObject(yaml.error)) ||
          (_.isObject(yaml.result) && !_.isObject(yaml.error))
        ) &&
        typeof yaml.yamlrpc === 'string', {
          msg: 'Invalid yamlrpc response format.',
        }
      );

      const normalized = {
        id: yaml.id,
        yamlrpc: yaml.yamlrpc,
      };

      if (_.isObject(yaml.result)) {
        normalized.result = yaml.result;
      } else {
        normalized.error = yaml.error;
      }

      return normalized;
    };

    const stringifyYAML = function (yaml) {
      try {
        return jsyaml.safeDump(yaml);
      } catch (error) {
        throw new ApplicationError({
          msg: error,
        });
      }
    };

    const parseRequest = function (data) {
      const normalized = normalizeYAMLRequest(parseYAML(data));
      normalized.version = normalized.yamlrpc;
      return normalized;
    };

    const parseResponse = function (response) {
      const normalized = normalizeYAMLResponse(parseYAML(response));
      return normalized;
    };

    const stringifyResponse = function (data, id = null, yamlrpc = '2.0') {
      return stringifyYAML({
        result: data,
        yamlrpc: yamlrpc,
        id: id,
      });
    };

    const stringifyRequest = function (data, id = null, yamlrpc = '2.0') {
      const { method, params } = data;
      return stringifyYAML({
        action: method,
        parameters: params,
        yamlrpc: yamlrpc,
        id: id,
      });
    };

    const error = function (error, yamlrpc = '2.0') {
      return stringifyYAML({
        yamlrpc: yamlrpc,
        error: error,
        id: null,
      });
    };

    return {
      name: 'yamlrpc',
      contentType: 'text/yaml',
      format: 'yaml',
      parseRequest: parseRequest,
      parseResponse: parseResponse,
      stringifyResponse: stringifyResponse,
      stringifyRequest: stringifyRequest,
      error: error,
    };
  }

  function jsonParser () {
    const parseRequest = function (data) {
      data.version = data.jsonrpc;
      return data;
    };

    const parseResponse = function (response) {
      const data = JSON.parse(response);
      data.version = data.jsonrpc;
      return data;
    };

    const stringifyRequest = function (data, id = null, jsonrpc = '2.0') {
      const { method, params } = data;
      return JSON.stringify({
        method: method,
        params: params,
        jsonrpc: jsonrpc,
        id: id,
      });
    };

    const stringifyResponse = function (data, id = null, jsonrpc = '2.0') {
      try {
        return JSON.stringify({
          jsonrpc: jsonrpc,
          id: id,
          result: data,
        });
      } catch (error) {
        throw new ApplicationError({
          msg: error,
        });
      }
    };

    const error = function (error, jsonrpc = '2.0') {
      try {
        return JSON.stringify({
          jsonrpc: jsonrpc,
          error: error,
          id: null,
        });
      } catch (error) {
        throw new ApplicationError({
          msg: error,
        });
      }
    };

    return {
      name: 'jsonrpc',
      contentType: 'application/json',
      format: 'json',
      parseRequest: parseRequest,
      parseResponse: parseResponse,
      stringifyResponse: stringifyResponse,
      stringifyRequest: stringifyRequest,
      error: error,
    };
  }

  function defineParsers (args) {
    const parsers = args.map(function (arg) { // eslint-disable-line prefer-arrow-callback
      return arg();
    });

    const getParser = function (parsers) {
      return function (name) {
        assertApp(typeof name === 'string', {
          msg: 'Can\'t get parser \'' + name + '\', typeof=' + typeof name + '', // eslint-disable-line prefer-template
        });

        var i; // eslint-disable-line no-var

        for (i = 0; i < parsers.length; i++) {
          if (parsers[i].name === name) {
            return parsers[i];
          }
        }

        throw new ApplicationError({
          msg: 'No parser with name \'' + name + '\'', // eslint-disable-line prefer-template
        });
      };
    };

    return getParser(parsers);
  }

  $(document).ready(function () { // eslint-disable-line prefer-arrow-callback
    $messageBar = $('#message-bar');
  });

  window.addEventListener('error', function (error) { // eslint-disable-line prefer-arrow-callback
    handleError(error);

    // suppress
    return true;
  });

  function handleError (error) {
    console.log(error);

    if (error.userMessage) {
      displayUserMessage(error.userMessage, 'error');
    }
  }

  return {
    BaseError: BaseError,
    ApplicationError: ApplicationError,
    PeerError: PeerError,
    UserError: UserError,
    handleError: handleError,
    displayUserMessage: displayUserMessage,
    assertApp: assertApp,
    assertPeer: assertPeer,
    assertUser: assertUser,
    trace: trace,
    sendRequest: sendRequest,
    sendError: sendError,
    listAirports: listAirports,
    yamlParser: yamlParser,
    jsonParser: jsonParser,
    defineParsers: defineParsers,
    SERVER_URL: SERVER_URL,
  };
}
