from error.exceptions import UserError, PeerError

def assert_user(condition, msg, status_code):
    if not condition:
        raise UserError(msg, status_code)

def assert_peer(condition, msg, status_code):
    if not condition:
        raise PeerError(msg, status_code)
