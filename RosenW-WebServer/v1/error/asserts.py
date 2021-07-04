from exceptions import *

def assertUser(condition, msg, status_code):
  if not condition:
    raise UserError(msg, status_code)

def assertPeer(condition, msg, status_code):
  if not condition:
    raise PeerError(msg, status_code)
