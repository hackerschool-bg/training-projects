import pwd
from config import CONFIG

UID = pwd.getpwnam(CONFIG['user']).pw_uid
