const YAMLParser = require('js-yaml');
const { assertPeer, AppError, PeerError } = require('./error-handling');
const { isObject } = require('lodash');

function yamlParser () {
  const parseYAML = (yaml) => {
    try {
      return YAMLParser.safeLoad(yaml);
    } catch (error) {
      throw new PeerError('Invalid input format. Cannot parse YAML.');
    }
  };

  const normalizeYAML = (yaml) => {
    assertPeer(
      isObject(yaml) &&
      isObject(yaml.parameters) &&
      typeof yaml.yamlrpc === 'string' &&
      typeof yaml.action === 'string',
      'Invalid input format.'
    );

    return {
      yamlrpc: yaml.yamlrpc,
      method: yaml.action,
      params: yaml.parameters,
      id: yaml.id,
    };
  };

  const stringifyYAML = (yaml) => {
    try {
      return YAMLParser.safeDump(yaml);
    } catch (error) {
      throw new AppError(error);
    }
  };

  const execute = (data) => {
    const normalized = normalizeYAML(parseYAML(data));
    return {
      ...normalized,
      version: normalized.yamlrpc,
    };
  };

  const stringify = (data, yamlrpc = '2.0', id = null) => {
    return stringifyYAML({ result: data, yamlrpc, id });
  };

  const error = (error, yamlrpc = '2.0') => {
    return stringifyYAML({ yamlrpc, error, id: null });
  };

  return {
    contentType: 'text/yaml',
    format: 'yaml',
    execute,
    stringify,
    error,
  };
}

function jsonParser () {
  const execute = (data) => {
    return {
      ...data,
      version: data.jsonrpc,
    };
  };

  const stringify = (data, jsonrpc = '2.0', id = null) => {
    try {
      return JSON.stringify({ jsonrpc, id, result: data });
    } catch (error) {
      throw new AppError(error);
    }
  };

  const error = (error, jsonrpc = '2.0') => {
    try {
      return JSON.stringify({ jsonrpc, error, id: null });
    } catch (error) {
      throw new AppError('Data could not be stringified.');
    }
  };

  return {
    contentType: 'application/json',
    format: 'json',
    execute,
    stringify,
    error,
  };
}

// const closure = (param1) => {
//   return (param2) => {
//     return param1 + param2;
//   }
// };

function defineParsers (...args) {
  const parsers = args.map((arg) => arg());

  const assertType = (type) => {
    assertPeer(
      isObject(type) &&
      (!type.contentType || typeof type.contentType === 'string') &&
      (!type.format || typeof type.format === 'string'),
      'Invalid content type.'
    );
  };

  const assertFormat = (parser, format) => {
    assertPeer(
      parser.format === format ||
      !format,
      'Ambiguous content type.'
    );
  };

  const assertContentType = (parser, contentType) => {
    assertPeer(
      parser.contentType === contentType ||
      !contentType,
      'Ambiguous content type.'
    );
  };

  const parse = (parsers) => (data, type) => {
    assertType(type);

    for (const parser of parsers) {
      if (parser.contentType === type.contentType) {
        assertFormat(parser, type.format);

        return parser.execute(data);
      } else if (parser.format === type.format) {
        assertContentType(parser, type.contentType);

        return parser.execute(data);
      }
    }
    throw new PeerError('Unknown content type.');
  };

  const stringify = (data, metadata) => {
    const { type, version, id } = metadata;
    assertType(type);

    for (const parser of parsers) {
      if (parser.contentType === type.contentType) {
        assertFormat(parser, type.format);

        return parser.stringify(data, version, id);
      } else if (parser.format === type.format) {
        assertContentType(parser, type.contentType);

        return parser.stringify(data, version, id);
      }
    }
    throw new PeerError('Unknown content type.');
  };

  const error = (error, type) => {
    assertType(type);

    for (const parser of parsers) {
      if (parser.contentType === type.contentType) {
        assertFormat(parser, type.format);

        return parser.error(error);
      } else if (parser.format === type.format) {
        assertContentType(parser, type.contentType);

        return parser.error(error);
      }
    }
    throw new PeerError('Unknown content type.');
  };

  return {
    parse: parse(parsers),
    stringify,
    error,
  };
}

module.exports = {
  defineParsers,
  jsonParser,
  yamlParser,
};
