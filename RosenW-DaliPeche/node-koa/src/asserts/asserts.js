const { AppError, PeerError, UserError } = require('./exceptions.js');

const assert = (condition, msg, statusCode) => {
  testIfConditionIsBoolean(condition, statusCode);
  if (condition) return;

  throw new AppError(msg, statusCode);
};

const assertPeer = (condition, msg, statusCode) => {
  testIfConditionIsBoolean(condition, statusCode);
  if (condition) return;

  throw new PeerError(msg, statusCode);
};

const assertUser = (condition, msg, statusCode) => {
  testIfConditionIsBoolean(condition, statusCode);
  if (condition) return;

  throw new UserError(msg, statusCode);
};

const testIfConditionIsBoolean = (condition, statusCode) => {
  if (typeof condition !== 'boolean') {
    throw new AppError(`type of condition in assert with status code ${statusCode} should be boolean instead got ${typeof condition}`, 999);
  }
}

module.exports = {
    assert,
    assertUser,
    assertPeer,
  };
