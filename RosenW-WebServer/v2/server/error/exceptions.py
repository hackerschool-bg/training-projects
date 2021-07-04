class WSException(Exception):
    def __init__(self, message):
        super().__init__(message)

class SubprocessLimitException(WSException):
    def __init__(self, message):
        super().__init__(message)

class PeerError(WSException):
    def __init__(self, message, status_code):
        super().__init__(message)
        self.status_code = status_code

class UserError(WSException):
    def __init__(self, message, status_code):
        super().__init__(message)
        self.status_code = status_code

class ServerError(WSException):
    def __init__(self, message, status_code):
        super().__init__(message)
        self.status_code = status_code
