#!/usr/bin/python
import socket
import sys
import time
import signal
import os
import datetime
import traceback
from error.asserts import *
from error.exceptions import *
from utils.sender import *
from utils.http_status_codes_headers import HTTPHeaders
from utils.logger import Logger
from ConfigParser import ConfigParser

class Server:
  HEADER_END_STRING = '\r\n\r\n'

  def __init__(self, opts):
    self.opts = opts
    self.headers = HTTPHeaders()
    self.log = Logger({'error': opts['error_path']})
    self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1) # level, optname, value
    self.sock.bind((opts['address'], opts['port']))
    self.sock.listen(opts['request_queue_size'])
    self.log.info('Server started on port {}'.format(opts['port']))
    self.env = {}
    self.max_subprocess_count = opts['subprocess_count']
    self.workers = 0
    self.timeout = opts['timeout']
    signal.signal(signal.SIGCHLD, self.kill_children)

  def start(self):
    connection = None
    pid = None

    while True:
      try:
        connection, client_address = self.sock.accept()
        self.log.debug(self.workers)
        if self.workers >= self.max_subprocess_count:
          raise SubprocessLimitError('Accepted Connection, but workers where over the allowed limit')
        self.log.info('accepted connection: {}'.format(client_address))

        self.workers += 1
        pid = os.fork()
        if pid == 0:
          try:
            self.handle_request(connection, client_address)
          except BaseException as e:
            self.log.error(e)
          finally:
            break
      except SubprocessLimitError as e:
        try:
          self.log.warn(e)
          send(connection, self.generate_headers(503))
        except BaseException as ex:
          self.log.error(ex)
      except (IOError, OSError) as e:
        if e.errno != os.errno.EINTR and e.errno != os.errno.EPIPE: # TODO simplify
          try:
            self.log.error(e)
            send(connection, self.generate_headers(500))
          except BaseException as ex:
            self.log.error(ex)
          self.log.error(e)
        else:
          self.log.warn(e)
      except (IndexError, ValueError) as e:
        try:
          self.log.error(e)
          send(connection, self.generate_headers(500))
        except BaseException as ex:
          self.log.error(ex)
        self.log.error(e)
      except KeyboardInterrupt as e:
        self.log.info('Stopping Server...')
        break
      except BaseException as e:
        self.log.error(e)
        break
      finally:
        if connection and pid != 0:
          self.log.debug('Server closing sending socket')
          connection.close()

    sys.exit()

  def handle_request(self, connection, client_address):
    request = None

    try:
      self.sock.close()
      assert isinstance(client_address, tuple) and len(client_address) == 2
      self.env = {'host': client_address[0], 'port': client_address[1]}
      connection.settimeout(self.timeout)
      request = self.recv_request(connection)
      self.env['request_time'] = time.strftime("%a, %d %b %Y %H:%M:%S", time.localtime())
      self.parse_request(request)

      if self.env['request_method'] == 'GET':
        html = self.get_requested_file(self.env['whole_path'])

      send(connection, self.generate_headers(200))
      send(connection, html)
    except KeyboardInterrupt as e:
      pass
    except PeerError as e:
      self.log.warn(e)
      send(connection, self.generate_headers(400))
    except FileNotFoundError as e:
      self.log.warn(e)
      send(connection, self.generate_headers(404))
    except socket.timeout as e:
      self.log.warn(e)
      send(connection, self.generate_headers(408))
    except IOError as e:
      if e.errno != os.errno.EPIPE:
        self.log.error(e)
      else:
        self.log.warn(e)
    except BaseException as e:
      self.log.error(e)
      send(connection, self.generate_headers(500))
    finally:
      connection.close()
      if request:
        self.log_request(request)
    self.log.info('Request Handled')

  def get_requested_file(self, path):
    try:
      path = self.resolve_path(path)
      self.log.info(os.path.abspath('./static/{}'.format(path)))
      with open('./static{}'.format(path), "r") as file:
        return file.read() # TODO segment reading
    except IOError:
      raise FileNotFoundError('File not found: {}'.format(path), 'FILE_NOT_FOUND')

  def parse_request(self, request):
    assert isinstance(request, str)
    assert len(request) > 0

    self.env['request_first_line'] = request.splitlines()[0].rstrip('\r\n')

    tokens = self.env['request_first_line'].split()
    assert len(tokens) == 3
    (
      self.env['request_method'],  # GET
      self.env['whole_path'],      # /hello.html
      self.env['request_version']  # HTTP/1.1
    ) = tokens

  def log_request(self, request):
    today = datetime.date.today()
    now = str(datetime.datetime.now())

    assert isinstance(self.env['host'], str) and isinstance(self.env['port'], int)
    assert self.env

    with open('./logs/access.log', "a+") as file:
      file.write('{} {} {} {} "{}" {} {}\n'.format(
        self.env.get('host', '-'),
        self.env.get('remote_logname', '-'),
        self.env.get('remote_user', '-'),
        self.env.get('request_time', '-'),
        self.env.get('request_first_line', '-'),
        self.env.get('status_code', '-'),
        self.env['content_length'] if 'content_length' in self.env and self.env['content_length'] > 0 else '-'
      ))
    self.log.info('request logged')

  def recv_request(self, connection):
    data = connection.recv(self.opts['recv'])
    while self.HEADER_END_STRING not in data:
      data += connection.recv(self.opts['recv'])
    total_length = self.parse_headers(data)
    while len(data) != total_length:
      data += connection.recv(self.opts['recv'])
    self.log.info('Request Recved')
    return data

  def parse_headers(self, data):
    assertPeer(len(data) <= self.opts['max_header_length'], 'Headers too long', 'HEADERS_TOO_LONG')
    headers_length = data.find(self.HEADER_END_STRING) + len(self.HEADER_END_STRING)
    header_dict = {}
    for header in data[:headers_length].split('\r\n'):
      if ': ' in header:
        header_tokens = header.split(': ')
        header_dict[header_tokens[0]] = header_tokens[1]
    if 'Content-Length' in header_dict:
      content_length = header_dict['Content-Length']
    else:
      content_length = 0

    self.env['headers'] = header_dict
    self.env['headers_length'] = headers_length
    self.env['content_length'] = content_length

    return headers_length + content_length

  def generate_headers(self, response_code):
    self.env['status_code'] = response_code

    header = ''
    header += self.headers.get_header(response_code)

    self.log.debug(header)

    if response_code == 200:
      header += 'Content-Type: text/html\r\n'
    header += 'Date: {}\r\n'.format(time.strftime("%a, %d %b %Y %H:%M:%S", time.localtime()))
    header += 'Connection: close\r\n\r\n'
    self.response_code = response_code
    return header

  def resolve_path(self, path):
    path = path.replace('../', '') # TODO ../ is ok
    if os.path.islink(path):
      return ''
    return path

  def kill_children(self, signum, frame):
    try:
      while True:
        (pid, exit_status) = os.waitpid(-1, os.WNOHANG)
        if pid == 0:
          break
        self.workers -= 1
    except BaseException as e:
      if e.errno != os.errno.ECHILD:
        self.log.error(e)

if __name__ == '__main__':
  DEFAULT_REQUEST_QUEUE_SIZE = 5
  DEFAULT_TIMEOUT = 5
  DEFAULT_ADDRESS = ''
  DEFAULT_PORT = 8888
  DEFAULT_SUBPROCESS_COUNT = 20
  DEFAULT_RECV = 4096
  DEFAULT_ERROR_PATH = ''
  DEFAULT_MAX_HEADER_LENGTH = 4096

  config = ConfigParser()
  config.read('./etc/config.ini')

  port = config.get('server', 'port')
  address = config.get('server', 'address')
  request_queue_size = config.get('server', 'request_queue_size')
  timeout = config.get('server', 'timeout')
  subprocess_count = config.get('server', 'subprocess_count')
  recv = config.get('server', 'recv')
  error_path = config.get('server', 'error_path')
  max_header_length = config.get('server', 'max_header_length')

  opts = {
    'port': int(port) if port.isdigit() else DEFAULT_PORT,
    'address': address or DEFAULT_ADDRESS,
    'request_queue_size': int(request_queue_size) if request_queue_size.isdigit() else DEFAULT_REQUEST_QUEUE_SIZE,
    'timeout': int(timeout) if timeout.isdigit() else DEFAULT_TIMEOUT,
    'subprocess_count': int(subprocess_count) if subprocess_count.isdigit() else DEFAULT_SUBPROCESS_COUNT,
    'recv': int(recv) if recv.isdigit() else DEFAULT_RECV,
    'max_header_length': int(max_header_length) if max_header_length.isdigit else DEFAULT_MAX_HEADER_LENGTH,
    'error_path': error_path or DEFAULT_ERROR_PATH
  }

  Server(opts).start()