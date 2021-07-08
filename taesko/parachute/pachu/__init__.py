import logging.config

from flask import Flask, g

from pachu.config import config
import pachu.db
import pachu.api

logging.config.fileConfig(config['resources']['log_config_file'])
app = Flask(__name__)


@app.before_request
def connect_to_db():
    cursor = pachu.db.connect()
    g.cursor = cursor
    g.exception_occurred = False


@app.after_request
def disconnect_from_db(response):
    pachu.db.disconnect(exception_occurred=g.exception_occurred,
                        cursors=[g.cursor],
                        close_connections=True)

    return response

app.register_blueprint(pachu.api.API)
