'use strict';

const { unescape } = require('querystring');
const { assert, isObject } = require('./web_server_utils.js');
const { CONFIG } = require('./config.js');

const allowedHTTPMethods = Object.freeze([
  'GET',
]);

const responseReasonPhrases = new Map([
  [ 200, 'OK' ],
  [ 400, 'Bad Request' ],
  [ 403, 'Forbidden' ],
  [ 404, 'Not Found' ],
  [ 503, 'Service Unavailable' ],
]);

const parseReqMeta = (reqMeta) => {
  assert(typeof reqMeta === 'string');

  const reqMetaLines = reqMeta.split('\r\n');

  if (reqMetaLines.length <= 0) {
    throw Error('invalid request');
  }

  const [reqLine, ...headerLines] = reqMetaLines;
  const reqLineSplit = reqLine.split(' ');

  if (reqLineSplit.length !== 3) {
    throw Error('invalid request');
  }

  const [method, targetEscaped, httpVersion] = reqLineSplit;
  const target = unescape(targetEscaped);

  if (!allowedHTTPMethods.includes(method)) {
    throw Error('invalid request');
  }

  const targetSplit = target.split('?');

  let queryString;

  if (targetSplit.length === 1) {
    queryString = '';
  } else if (targetSplit.length === 2) {
    queryString = targetSplit[1];
  } else {
    throw Error('invalid request');
  }

  const path = targetSplit[0];

  const headers = Object.create(null);

  for (const headerLine of headerLines) {
    const headerLineSplit = headerLine.split(':', 2);

    if (headerLineSplit.length !== 2) {
      throw Error('invalid request');
    }

    const [fieldName, fieldValUntrimmed] = headerLineSplit;

    if (fieldName.length !== fieldName.trim().length) {
      throw Error('invalid request');
    }

    const fieldValue = fieldValUntrimmed.trim();

    headers[fieldName] = fieldValue;
  }

  const userAgent = headers['User-Agent'] || '';

  return {
    reqLineRaw: reqLine,
    method,
    target,
    path,
    queryString,
    httpVersion,
    headers,
    userAgent,
  };
};

const buildResMeta = (statusCode, headers) => {
  assert(responseReasonPhrases.has(statusCode));
  assert(isObject(headers));

  const headersStringified = Object.entries(headers)
    .map(([name, val]) => `${name}: ${val}`)
    .join('\r\n');

  return `${CONFIG.protocol} ${statusCode} ${responseReasonPhrases.get(statusCode)}\r\n${headersStringified}\r\n\r\n`;
};

module.exports = {
  parseReqMeta,
  buildResMeta,
};
