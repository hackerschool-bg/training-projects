import datetime
import traceback

class Logger:
  def __init__(self, opts):
    self.opts = opts

  def log(self, level_str, s):
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
      try:
        traceback.print_exc()
      except:
        pass

  def trace(self, s):
    self.log('trace', s)

  def debug(self, s):
    self.log('debug', s)

  def info(self, s):
    self.log('info', s)

  def warn(self, s):
    self.log('warn', s)

  def error(self, s):
    self.log('error', s)

  def fatal(self, s):
    self.log('fatal', s)

  def format(self, level_str, s):
    return '[{}] - {} - {}\n'.format(level_str.capitalize(), str(datetime.datetime.now()), s)
