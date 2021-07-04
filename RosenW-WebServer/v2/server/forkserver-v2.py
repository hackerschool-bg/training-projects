#!/usr/bin/python
import socket
import sys
import time
import signal
import os
import datetime
import traceback
import configparser
import resource
import cProfile
import subprocess
import ssl
import urllib.parse
from error.asserts import assert_user, assert_peer
from error.exceptions import SubprocessLimitException, PeerError, ServerError
from utils.http_status_codes_headers import StatusLines
from utils.logger import Logger

class Server(object):
    HEADER_END_STRING = '\r\n\r\n'
    HEADER_SEPARATOR = ': '

    def __init__(self, opts):
        try:
            os.rename(opts['logs_path'] + '/access.log', opts['logs_path'] + '/old_access.log')
            os.rename(opts['logs_path'] + '/error.log', opts['logs_path'] + '/old_error.log')
        except OSError as e:
            pass

        self.opts = opts
        self.status_lines = StatusLines()
        self.logger = Logger(opts['log_level'], { 'error': opts['logs_path'] + '/error.log', 'trace': opts['logs_path'] + '/trace.log'})
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        if opts['ssl_on'].lower() in ['true', '1', 't', 'y', 'yes', 'uh-huh', 'yup']:
            self.sock = ssl.wrap_socket(
                self.sock,
                certfile=opts['ssl_cert'],
                keyfile=opts['ssl_key'],
                server_side=True)
        self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1) # level, optname, value
        self.sock.bind((opts['address'], opts['port']))
        self.sock.listen(opts['request_queue_size'])
        self.env = {}
        self.accepted_connections = 0
        self.error_count = 0
        self.workers = 0
        self.max_subprocess_count = opts['subprocess_count']
        self.start_time = time.time()
        self.is_reaping_children_locked = False
        signal.signal(signal.SIGCHLD, self.reap_children)

    def start(self):
        self.safeLog('info', 'Server PID: {}'.format(os.getpid()))
        self.safeLog('info', 'Server started on port {}'.format(opts['port']))

        while True:
            connection = None
            pid = None

            try:
                connection, client_address = self.sock.accept()
                self.accepted_connections += 1
                self.safeLog('debug', 'Current workers {}'.format(self.workers))
                if self.workers >= self.max_subprocess_count:
                    raise SubprocessLimitException('Accepted Connection, but workers were over the allowed limit')
                self.safeLog('debug', 'accepted connection: {}'.format(client_address))

                self.is_reaping_children_locked = True
                self.workers += 1
                self.is_reaping_children_locked = False

                self.safeLog('trace', 'workers++ {}'.format(self.workers))
                pid = os.fork()
                if pid == 0:
                    self.close_inherited_fds()
                    self.handle_request(connection, client_address)
                    break
            except SubprocessLimitException as e:
                self.sendall(connection, self.generate_headers(503))
            except OSError as e:
                if e.errno not in [os.errno.EINTR, os.errno.EPIPE]:
                    self.safeLog('error', e)
            except KeyboardInterrupt:
                self.safeLog('info', 'Stopping Server...')
                raise
            except SystemExit as e:
                raise
            except BaseException as e:
                if connection:
                    self.sendall(connection, self.generate_headers(500))
                    self.log_request()
                self.safeLog('error', e)
            finally:
                if connection and pid != 0:
                    try:
                        self.safeLog('debug', 'Server closing sending socket')
                        connection.close()
                    except OSError as e:
                        self.safeLog('error', e)

    def handle_request(self, connection, client_address):
        request = None

        try:
            (
                self.env['memory_start'],
                self.env['cpu']
            ) = self.get_process_info()
            assert isinstance(client_address, tuple) and len(client_address) == 2
            self.env['client_ip'] = client_address[0]
            self.env['port'] = client_address[1]
            self.env['request_time'] = datetime.datetime.now().isoformat()
            connection.settimeout(self.opts['timeout'])
            (content_length, body_chunk) = self.recv_request(connection)

            if self.env['request_method'] not in ['GET', 'POST']:
                self.sendall(connection, self.generate_headers(405))
                return

            self.respond(connection, content_length, body_chunk)

        except (KeyboardInterrupt, RuntimeError) as e:
            pass
        except PeerError as e:
            self.sendall(connection, self.generate_headers(400))
        except (FileNotFoundError, IsADirectoryError) as e:
            self.sendall(connection, self.generate_headers(404))
        except socket.timeout as e:
            self.sendall(connection, self.generate_headers(408))
        except IOError as e:
            if e.errno == os.errno.EPIPE:
                self.safeLog('warn', e)
            else:
                self.safeLog('error', e)
                self.sendall(connection, self.generate_headers(500))
        except BaseException as e:
            self.safeLog('error', e)
            self.sendall(connection, self.generate_headers(500))
        finally:
            try:
                connection.close()
                (
                    self.env['memory_end'],
                    self.env['cpu']
                ) = self.get_process_info()
                self.log_request()
                os._exit(0)
            except ServerError as e:
                self.safeLog('error', e)
            except BaseException as e:
                self.safeLog('error', e)
                sys.exit()

    def respond(self, connection, content_length, body_chunk):
        static_path = os.path.abspath(self.opts['static_dir_path'])
        cgi_path = os.path.abspath(self.opts['cgi_bin_dir_path'])


        whole_static_path = os.path.abspath(static_path + self.env['path'])
        whole_cgi_path = os.path.abspath(cgi_path + self.env['path'])

        self.env['script_abs_path'] = whole_cgi_path

        try:
            if self.env['request_method'] == 'GET' and self.env['path'] == self.opts['status_path']:
                self.send_status(connection)
                return
            if os.path.islink(whole_static_path) or self.env['request_method'] != 'GET':
                raise FileNotFoundError()
            elif whole_static_path.startswith(static_path):
                with open(whole_static_path, "rb") as file:
                    self.sendall(connection, self.generate_headers(200))
                    while True:
                        content = file.read(1024)
                        if not content:
                          break
                        self.sendall(connection, content)
            else:
                raise FileNotFoundError()
        except FileNotFoundError:
            if os.path.islink(whole_cgi_path):
                raise FileNotFoundError()
            elif whole_cgi_path.startswith(cgi_path) and whole_cgi_path[len(whole_cgi_path)-4:] == '.cgi' and os.path.exists(whole_cgi_path):
                self.env['script_filename'] = whole_cgi_path.split('/')[-1]
                proc_env = self.generate_environment()
                try:
                    proc = subprocess.Popen(whole_cgi_path, stdin=subprocess.PIPE, stdout=subprocess.PIPE, env=proc_env)
                    proc.stdin.write(body_chunk)
                    bytes_sent = len(body_chunk)

                    while bytes_sent < int(content_length):
                        chunk = self.recv(connection, self.opts['recv'])
                        if not chunk:
                            raise RuntimeError("socket connection broken")
                        proc.stdin.write(chunk)
                        bytes_sent += len(chunk)
                    proc.stdin.close()

                    self.sendall(connection, self.generate_headers(200))
                    while True:
                        line = proc.stdout.readline()
                        if line:
                            self.sendall(connection, line)
                        else:
                            break
                    proc.stdout.close()
                except:
                    raise
                finally:
                    proc.stdin.close()
                    proc.stdout.close()
            else:
                raise FileNotFoundError()

    def recv_request(self, connection):
        data = self.recv(connection, self.opts['recv'])
        if not data:
            raise RuntimeError("socket connection broken")
        while self.HEADER_END_STRING.encode() not in data:
            chunk = self.recv(connection, self.opts['recv'])
            if not chunk:
                raise RuntimeError("socket connection broken")
            data += chunk

        (headers, body_chunk) = data.split(str.encode(self.HEADER_END_STRING))
        content_length = self.parse_headers(headers)

        return (content_length, body_chunk)

    def parse_headers(self, headers):
        headers = headers.decode('UTF-8')
        assert_peer(len(headers) <= self.opts['max_header_length'], 'Headers too long', 'HEADERS_TOO_LONG')

        assert isinstance(headers, str)
        assert len(headers) > 0

        self.env['headers_first_line'] = headers.splitlines()[0].rstrip('\r\n')

        tokens = self.env['headers_first_line'].split()
        assert len(tokens) == 3
        (
            self.env['request_method'],    # GET
            self.env['whole_path'],        # /hello.html
            self.env['request_version']    # HTTP/1.1
        ) = tokens

        if '?' in self.env['whole_path']:
            (self.env['path'], self.env['query_string']) = self.env['whole_path'].split('?')
        else:
            self.env['path'] = self.env['whole_path']
            self.env['query_string'] = ''

        self.env['path'] = urllib.parse.unquote(self.env['path'])

        headers_length = headers.find(self.HEADER_END_STRING) + len(self.HEADER_END_STRING)
        header_dict = {}
        for header in headers.split('\r\n'):
            if self.HEADER_SEPARATOR in header:
                header_tokens = header.split(self.HEADER_SEPARATOR)
                header_dict[header_tokens[0]] = self.HEADER_SEPARATOR.join(header_tokens[1:]) # in case header value contains the separator
        if 'Content-Length' in header_dict:
            content_length = header_dict['Content-Length']
        else:
            content_length = 0

        self.env['headers'] = header_dict
        self.env['headers_length'] = headers_length
        self.env['content_length'] = content_length

        return content_length

    def generate_headers(self, response_code):
        self.env['status_code'] = response_code

        header = ''
        header += self.status_lines.get_status_line(response_code)

        self.safeLog('debug', header)

        if response_code == 200:
            header += 'Content-Type: text/html\r\n'
        header += 'Date: {}\r\n'.format(time.strftime("%a, %d %b %Y %H:%M:%S", time.localtime()))
        header += 'Connection: close\r\n\r\n'
        self.response_code = response_code
        return header

    def reap_children(self, signum, frame):
        self.safeLog('trace', 'reap children called')
        if self.is_reaping_children_locked:
            self.safeLog('trace', 'reap children blocked by flag')
            return

        self.is_reaping_children_locked = True
        self.safeLog('trace', 'reap children flagged as blocked')

        try:
            while os.waitpid(-1, os.WNOHANG)[0] > 0:
                self.workers -= 1
                self.safeLog('trace', 'workers--: {}'.format(self.workers))
        except ServerError as e:
            self.safeLog('debug', e)
        except OSError as e:
            if e.errno != os.errno.ECHILD:
                self.safeLog('error', e)
        except BaseException as e:
            self.safeLog('error', e)
        finally:
            self.is_reaping_children_locked = False
            self.safeLog('trace', 'reap children unlocked')

    def log_request(self):
        try:
            with open(self.opts['logs_path'] + '/access.log', 'a+') as file:
                file.write('{} {} {} {} "{}" {} {} {} {} {} {} {}\n'.format(
                    self.env.get('client_ip', '-'),
                    self.env.get('remote_logname', '-'),
                    self.env.get('remote_user', '-'),
                    self.env.get('request_time', '-'),
                    self.env.get('headers_first_line', '-'),
                    self.env.get('status_code', '-'),
                    self.env['content_length'] if 'content_length' in self.env and int(self.env['content_length']) > 0 else '-',
                    self.env.get('memory_start', '-'),
                    self.env.get('memory_end', '-'),
                    self.env.get('cpu', '-'),
                    self.env.get('bytes_recved', '-'),
                    self.env.get('bytes_sent', '-')
                ))
                self.safeLog('debug', 'request logged')
        except Exception as e:
            self.safeLog('error', e)

    def safeLog(self, level_str, s):
        try:
            self.logger.log(level_str, s)
            if level_str in ['error', 'fatal']:
                self.error_count += 1
        except Exception as e:
            try:
                traceback.print_exc()
            except:
                pass

    def get_process_info(self):
        memory = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss * 1024 # converting from Kb to b
        cpu_usage = sum(resource.getrusage(resource.RUSAGE_SELF)[0:2])
        return (memory, cpu_usage)

    def send_status(self, connection):
        with open(self.opts['logs_path'] + '/access.log', 'a+') as file:
            file.seek(0)

            total_recved = 0
            total_sent = 0
            response_codes = {}

            for line in file:
                line.rstrip('\n')
                stats = line.split('"')[2].split()
                if stats[5].isdigit():
                    total_recved += int(stats[5])
                if stats[6].isdigit():
                    total_sent += int(stats[6])
                if stats[0].isdigit():
                    http_code = stats[0]

                    if http_code not in response_codes:
                        response_codes[http_code] = 1
                    else:
                        response_codes[http_code] += 1

        seconds = int((time.time() - self.start_time))
        minutes = int((seconds / 60) % 60)
        hours = int(seconds / 3600)
        uptime = '{} hour(s) {} minute(s) {} second(s)'.format(hours, minutes, seconds % 60)

        status = ''
        status += '<p>Server uptime: {}</p>'.format(uptime)
        status += '<p>Accepted connections: {}</p>'.format(self.accepted_connections - 1) # -1 current req not logged yet but counted as accepted
        status += '<p>Requests per second: {}</p>'.format(round((self.accepted_connections - 1) / seconds, 2))
        status += '<p>Total Traffic: {}b</p>'.format(total_recved + total_sent)
        status += '<p>Total Bytes Received: {}b</p>'.format(total_recved)
        status += '<p>Total Bytes Sent: {}b</p>'.format(total_sent)
        status += '<p>Errors since start: {}</p>'.format(self.error_count)
        status += '<p>Current workers: {}</p>'.format(self.workers)

        status += '<p>Responses (http code - count):</p>'
        for k, v in response_codes.items():
            status += '<p>{} - {}</p>'.format(k, v)

        self.sendall(connection, self.generate_headers(200))
        self.sendall(connection, status)

    def close_inherited_fds(self):
        try:
            self.sock.close()
            # closing stdin, stdout and stderr streams
            os.close(0) 
            # os.close(1)
            os.close(2)
        except Exception as e:
            self.safeLog('error', e)

    def generate_environment(self):
        return {
            'DOCUMENT_ROOT': self.opts.get('static_dir_path', ''),
            'HTTP_COOKIE': self.env.get('cookie', ''),
            'HTTP_HOST': self.env.get('headers', '').get('Host', '') + self.env.get('path', ''),
            'HTTP_REFERER': self.env.get('http_referer', ''),
            'HTTP_USER_AGENT': self.env.get('headers', '').get('User-Agent', ''),
            'HTTPS': 'off',
            'PATH': os.path.abspath('./'),
            'QUERY_STRING': self.env.get('query_string', ''),
            'REMOTE_ADDR': self.env.get('client_ip', ''),
            'REMOTE_HOST': self.env.get('host', ''),
            'REMOTE_PORT': str(self.env.get('port', '')),
            'REMOTE_USER': self.env.get('remote_user', ''),
            'REQUEST_METHOD': self.env.get('request_method', ''),
            'REQUEST_URI': self.env.get('path', ''),
            'SCRIPT_FILENAME': self.env.get('script_abs_path', ''),
            'SCRIPT_NAME': self.env.get('script_filename', ''),
            'SERVER_ADMIN': self.opts.get('admin_email', ''),
            'SERVER_NAME': self.opts.get('address', ''),
            'SERVER_PORT': str(self.opts.get('port', '')),
            'SERVER_SOFTWARE': "Python Super Web Server"
        }

    def sendall(self, socket, data):
        try: 
            self.env['bytes_sent'] = int(self.env.get('bytes_sent', 0)) + len(data)
            if isinstance(data, str):
                data = data.encode()
            socket.sendall(data)
        except OSError as e:
            if e.errno != os.errno.EPIPE:
                pass
        except BaseException as ex:
            try:
                traceback.print_exc()
            except:
                pass

    def recv(self, socket, chunk_size):
        chunk = socket.recv(chunk_size)
        self.env['bytes_recved'] = int(self.env.get('bytes_recved', 0)) + len(chunk)
        return chunk

if __name__ == '__main__':
    config = configparser.ConfigParser()
    config.read('/home/rosen/Desktop/repo/RosenW-WebServer/v2/etc/config.ini')

    port = config.getint('server', 'port')
    address = config.get('server', 'address')
    request_queue_size = config.getint('server', 'request_queue_size')
    timeout = config.getint('server', 'timeout')
    subprocess_count = config.getint('server', 'subprocess_count')
    recv = config.getint('server', 'recv')
    logs_path = config.get('server', 'logs_path')
    static_dir_path = config.get('server', 'static_dir_path')
    cgi_bin_dir_path = config.get('server', 'cgi_bin_dir_path')
    max_header_length = config.getint('server', 'max_header_length')
    log_level = config.get('server', 'log_level')
    status_path = config.get('server', 'status_path')
    admin_email = config.get('server', 'admin_email')
    ssl_cert = config.get('server', 'ssl_cert')
    ssl_key = config.get('server', 'ssl_key')
    ssl_on = config.get('server', 'ssl_on')

    opts = {
        'port': port,
        'address': address,
        'request_queue_size': request_queue_size,
        'timeout': timeout,
        'subprocess_count': subprocess_count,
        'recv': recv,
        'max_header_length': max_header_length,
        'logs_path': logs_path,
        'static_dir_path': static_dir_path,
        'cgi_bin_dir_path': cgi_bin_dir_path,
        'log_level': log_level,
        'status_path': status_path,
        'admin_email': admin_email,
        'ssl_cert': ssl_cert,
        'ssl_key': ssl_key,
        'ssl_on': ssl_on
    }

    Server(opts).start()
