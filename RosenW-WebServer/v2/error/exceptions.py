class FileNotFoundError(Exception):
  def __init__(self, message, status_code):
    super().__init__(message)
    self.status_code = status_code

class SubprocessLimitError(Exception):
  def __init__(self, message):
    super().__init__(message)

class PeerError(Exception):
  def __init__(self, message, status_code):
    super().__init__(message)
    self.status_code = status_code

class UserError(Exception):
  def __init__(self, message, status_code):
    super().__init__(message)
    self.status_code = status_code
