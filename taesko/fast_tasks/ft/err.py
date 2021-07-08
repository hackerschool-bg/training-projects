import logging


logger = logging.getLogger(__name__)


class BaseError(Exception):
    def __init__(self, msg, user_msg=None, code=None):
        super().__init__(msg)

        self.msg = msg
        self.userMsg = user_msg
        self.code = code

        logger.exception(self)

    @classmethod
    def assert_(cls, condition, msg, user_msg=None, code=None):
        if condition:
            raise cls(msg, user_msg, code)


class AppError(BaseError, AssertionError):
    def __init__(self, msg=None, user_msg='Application encountered an internal error.', code=None):
        super().__init__(msg, user_msg, code)


class SysError(BaseError):
    def __init__(self, msg, user_msg='Application encountered an internal error.', code=None):
        super().__init__(msg, user_msg, code)


class PeerError(BaseError):
    def __init__(self, msg, user_msg, code):
        super().__init__(msg, user_msg, code)


class UserError(BaseError):
    def __init__(self, msg='User entered an invalid input', *, user_msg, code):
        super().__init__(msg, user_msg, code)


assertSystem = SysError.assert_
assertPeer = PeerError.assert_
assertUser = UserError.assert_
