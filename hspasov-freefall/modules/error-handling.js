class CustomError extends Error {}
class PeerError extends CustomError {}
class AppError extends CustomError {}
class UserError extends CustomError {}

function assertApp (assert, errMsg) {
  if (!assert) {
    throw new AppError(errMsg);
  }
}

function assertUser (assert, errMsg) {
  if (!assert) {
    throw new UserError(errMsg);
  }
}

function assertPeer (assert, errMsg) {
  if (!assert) {
    throw new PeerError(errMsg);
  }
}

function handleError (err) {
  console.error('Error while fetching data:');
  console.error(err);
  process.exit();
}

module.exports = {
  assertApp,
  assertPeer,
  assertUser,
  PeerError,
  AppError,
  UserError,
  handleError,
};
