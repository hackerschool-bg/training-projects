class BaseError extends Error {}
class ApplicationError extends BaseError {}
// TODO AppError

function assert (condition, Error, ...args) {
  if (!condition) {
    throw new Error(...args);
  }
}

const assertApp = (condition, message) =>
  assert(condition, ApplicationError, message);

module.exports = {
  BaseError,
  ApplicationError,
  assertApp,
};
