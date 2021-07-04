import datetime
import traceback

class Logger(object):
    def __init__(self, log_level, opts):
        self.log_level = log_level
        self.opts = opts
        self.levels = { 
            'trace': 0,
            'debug': 1,
            'info': 2,
            'warn': 3,
            'error': 4,
            'fatal': 5,
        }

    def log(self, level_str, s):
        assert level_str in self.levels

        if self.levels[self.log_level] > self.levels[level_str]:
            return

        try:
            s = self.format(level_str, s)
            if level_str in ['error', 'fatal']:
                s += traceback.format_exc()
            if level_str in self.opts and self.opts[level_str]:
                with open(self.opts[level_str], "a+") as file:
                    file.write(s)
            else:
                print(s.strip('\n'))
        except:
            traceback.print_exc()

    def format(self, level_str, s):
        return '[{}] - {} - {}\n'.format(level_str.capitalize(), str(datetime.datetime.now()), s)
