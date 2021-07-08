import configparser
import os

from ws.err import *

DEV_CONF = './conf.d/config.ini'

config = configparser.ConfigParser()
config_file = os.environ.get('WS_CONFIG_FILE', DEV_CONF)

if not os.path.isfile(config_file):
    raise SysError(code='BAD_CONFIG_FILE',
                   msg='Config file {} does not exist or is a directory'
                   .format(config_file))

config.read(config_file)
