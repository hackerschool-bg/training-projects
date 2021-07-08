const YAMLParser = require('js-yaml');
const { assertApp, AppError } = require('./error-handling');
const { log } = require('./utils');

class UnsupportedFormat extends AppError {
  constructor (format) {
    super(`'${format}' format is not supported`);
  }
}

function yamlParser () {
  return {
    format: 'yaml',
    parse: YAMLParser.safeLoad,
    stringify: YAMLParser.safeDump,
  };
}

function jsonParser () {
  return {
    format: 'json',
    parse: JSON.parse,
    stringify: JSON.stringify,
  };
}

function defineParsers (...args) {
  const parsers = args.map((arg) => arg());
  const supportsFormat = parsers => format => {
    return parsers.some(parser => parser.format === format);
  };

  const findParser = (parsers, format) => {
    const parser = parsers.find(parser => parser.format === format);
    if (!parser) {
      throw new UnsupportedFormat(format);
    }
    return parser;
  };

  const parse = parsers => (data, format) => {
    const parser = findParser(parsers, format);
    try {
      return parser.parse(data);
    } catch (e) {
      log('Attempted to parse data', data, 'in format', format);
      assertApp(false, `Failed to parse data in format ${format}. Error: ${e}`);
    }
  };

  const stringify = parsers => (data, format) => {
    const parser = findParser(parsers, format);
    try {
      return parser.stringify(data);
    } catch (e) {
      log('Attempted to stringify object', data, 'in format', format);
      assertApp(false, `Failed to stringify object in format ${format}. Error: ${e}`);
    }
  };

  return {
    parse: parse(parsers),
    stringify: stringify(parsers),
    supportsFormat,
    findParser,
  };
}

module.exports = {
  defineParsers,
  jsonParser,
  yamlParser,
};
