import sys
import os
import inspect
from datetime import datetime
from config import CONFIG

# error log levels
ERROR = 1
WARNING = 2
DEBUG = 3
INFO = 4


class Log:
    # TODO fix redundancy
    log_lvls = {
        1: 'ERROR',
        2: 'WARNING',
        3: 'DEBUG',
        4: 'INFO',
    }

    def __init__(self):
        self.access_log_file = None

    @staticmethod
    def resolve_log_lvl_name(lvl):
        assert lvl in Log.log_lvls

        return Log.log_lvls[lvl]

    def error(self, lvl, *, var_name=None, var_value=None, msg=None):
        if lvl <= CONFIG['error_log_level']:
            fields = []

            if 'pid' in CONFIG['error_log_fields']:
                fields.append(format(os.getpid()))
            if 'timestamp' in CONFIG['error_log_fields']:
                fields.append(format(datetime.now()))
            if 'level' in CONFIG['error_log_fields']:
                fields.append(format(Log.resolve_log_lvl_name(lvl)))
            if 'context' in CONFIG['error_log_fields']:
                current_frame = inspect.currentframe()
                # TODO why does the following line cause the process to exit
                # caller_frame = inspect.getouterframes(current_frame, 2)
                # caller_function = caller_frame[1][3]
                # fields.append(format(caller_function))
            if 'var_name' in CONFIG['error_log_fields']:
                fields.append(
                    CONFIG['error_log_empty_field']
                    if var_name is None else format(var_name))
            if 'var_value' in CONFIG['error_log_fields']:
                fields.append(
                    CONFIG['error_log_empty_field']
                    if var_value is None else format(var_value))
            if 'msg' in CONFIG['error_log_fields']:
                fields.append(
                    CONFIG['error_log_empty_field']
                    if msg is None
                    else format(msg))

            print(CONFIG['error_log_field_sep'].join(fields),
                  file=sys.stderr)

    def access(self, *, remote_addr=None, req_line=None, user_agent=None,
               status_code=None, content_length=None):
        if CONFIG['access_log_enabled']:
            fields = []

            if self.access_log_file is None:
                self.error(ERROR, msg=('Attempt to write in uninitialized ' +
                                       'access log file'))
            else:
                if 'pid' in CONFIG['access_log_fields']:
                    fields.append(format(os.getpid()))
                if 'timestamp' in CONFIG['access_log_fields']:
                    fields.append(format(datetime.now()))
                if 'remote_addr' in CONFIG['access_log_fields']:
                    fields.append(
                        CONFIG['access_log_empty_field']
                        if remote_addr is None else format(remote_addr))
                if 'req_line' in CONFIG['access_log_fields']:
                    fields.append(
                        CONFIG['access_log_empty_field']
                        if req_line is None else format(req_line))
                if 'user_agent' in CONFIG['access_log_fields']:
                    fields.append(
                        CONFIG['access_log_empty_field']
                        if user_agent is None else format(user_agent))
                if 'status_code' in CONFIG['access_log_fields']:
                    fields.append(
                        CONFIG['access_log_empty_field']
                        if status_code is None else format(status_code))
                if 'content_length' in CONFIG['access_log_fields']:
                    fields.append(
                        CONFIG['access_log_empty_field']
                        if content_length is None else format(content_length))

                print(CONFIG['access_log_field_sep'].join(fields),
                      file=self.access_log_file)

    def init_access_log_file(self):
        self.access_log_file = open(CONFIG['access_log'], mode='a')

    def close_access_log_file(self):
        if self.access_log_file is not None:
            self.access_log_file.close()
        self.access_log_file = None


log = Log()
