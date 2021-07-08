import os
import configparser


config = configparser.ConfigParser()
config.read(os.environ['PARACHUTE_CONFIG_FILE'])

