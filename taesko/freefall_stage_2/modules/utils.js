const fetch = require('node-fetch');
const { assertApp, handleError } = require('./error-handling');

function toQueryString (params) {
  const paramsList = [];

  for (const [param, val] of Object.entries(params)) {
    paramsList.push([encodeURIComponent(param), encodeURIComponent(val)]);
  }

  return paramsList.map(pair => pair.join('=')).join('&');
}

async function requestJSON (url, parameters) {
  assertApp(
    typeof url === 'string',
    'Invalid url.'
  );

  let shouldPutQuestionMark = false;
  const questionMarkMatches = url.match(/\?/g);

  if (questionMarkMatches === null && parameters) {
    shouldPutQuestionMark = true;
  }

  const uri = url +
    ((shouldPutQuestionMark) ? '?' : '') +
    ((parameters) ? toQueryString(parameters) : '');

  log(uri);
  const response = await fetch(uri);

  return response.json();
}

function toSmallestCurrencyUnit (quantity) {
  return quantity * 100;
}

function fromSmallestCurrencyUnit (quantity) {
  return quantity / 100;
}

function log (...msg) {
  console.log(...msg);
}

module.exports = {
  log,
  handleError,
  requestJSON,
  toSmallestCurrencyUnit,
  fromSmallestCurrencyUnit,
};
