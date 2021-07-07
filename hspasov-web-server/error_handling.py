class BaseError(Exception):
    def __init__(self, msg):
        super().__init__(msg)
        self.msg = msg


class UserError(BaseError):
    def __init__(self, msg):
        super().__init__(msg)


class BufferLimitReachedError(Exception):
    def __init__(self, msg):
        super().__init__(msg)


def assert_user(condition, msg=''):
    assert isinstance(condition, bool)

    if not condition:
        raise UserError(msg)
