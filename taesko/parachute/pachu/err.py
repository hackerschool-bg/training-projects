class BaseError(Exception):
    def __init__(self, *, msg=None, code=None, user_msg=None):
        super().__init__(msg)

        self.code = code
        self.user_msg = user_msg
        self.msg = msg

    @classmethod
    def assert_(cls, condition, *args, **kwargs):
        if not condition:
            cls(*args, **kwargs)


class AppError(BaseError, AssertionError):
    def __init__(self, *args,
                 user_msg='An application error occurred.', **kwargs):
        super().__init__(*args, user_msg=user_msg, **kwargs)


class SystemError(BaseError):
    def __init__(self, *args, user_msg='An internal error occurred.', **kwargs):
        super().__init__(*args, user_msg=user_msg, **kwargs)


class PeerError(BaseError):
    def __init__(self, *, msg, code, user_msg=None):
        super().__init__(msg=msg, code=code, user_msg=user_msg)


class UserError(BaseError):
    def __init__(self, *, msg, code, user_msg):
        super().__init__(msg=msg, code=code, user_msg=user_msg)


assertApp = AppError.assert_
assertSystem = PeerError.assert_
assertPeer = PeerError.assert_
assertUser = PeerError.assert_
