import collections
import logging

import psycopg2
import psycopg2.extras
import psycopg2.extensions

from pachu.config import config

stderr_logger = logging.getLogger('stderr')


def connect():
    connection_str = 'dbname={name} user={user} password={pw}'
    connection_str = connection_str.format(name=config['db']['name'],
                                           user=config['db']['user'],
                                           pw=config['db']['password'])
    connection = psycopg2.connect(
        connection_str,
        connection_factory=psycopg2.extras.LoggingConnection
    )
    connection.initialize(stderr_logger)
    return connection.cursor()


def disconnect(exception_occurred, cursors, close_connections=True):
    assert isinstance(exception_occurred, bool)
    assert isinstance(cursors, collections.Iterable)

    for cursor in cursors:
        assert isinstance(cursor, psycopg2.extensions.cursor)

        connection = cursor.connection

        if exception_occurred:
            connection.rollback()
        else:
            connection.commit()

        cursor.close()

        if close_connections:
            connection.close()
