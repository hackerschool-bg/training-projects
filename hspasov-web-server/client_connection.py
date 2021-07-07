import select
import enum
import socket
import os
import sys
import fcntl
import traceback
import errno
import signal
import ssl
from profiler import ClientConnectionMonit
from config import CONFIG
from log import log, DEBUG, ERROR
from http_meta import ResponseMeta
from http_msg_formatter import HTTP1_1MsgFormatter
from cgi_handler import CGIHandler, CGIMsgFormatter
from error_handling import BufferLimitReachedError


class ClientConnection:
    class State(enum.Enum):
        ESTABLISHED = enum.auto()
        RECEIVING = enum.auto()
        SENDING = enum.auto()
        CLOSED = enum.auto()

    def __init__(self, conn, addr):
        log.error(DEBUG, msg='conn __init__')

        assert isinstance(conn, socket.socket)
        assert isinstance(addr, tuple)
        assert len(addr) == 2
        assert isinstance(addr[0], str)
        assert isinstance(addr[1], int)

        self._conn = conn
        self._monit = ClientConnectionMonit([
            'connection',
            'receive_meta',
            'send_meta',
            'serve_static',
            'serve_cgi',
        ])
        self.remote_addr = addr[0]
        self.remote_port = addr[1]
        self._req_meta_raw = b''
        self._msg_buffer = None
        self.state = ClientConnection.State.ESTABLISHED
        self.req_meta = None
        self.res_meta = ResponseMeta()
        self.cgi_script_pid = None

        self._monit.mark_begin('connection')

    def receive_meta(self):
        log.error(DEBUG, msg='conn receive_meta')
        self._monit.mark_begin('receive_meta')

        try:
            assert self.state == ClientConnection.State.ESTABLISHED

            self.state = ClientConnection.State.RECEIVING

            while len(self._req_meta_raw) <= CONFIG['req_meta_limit']:
                log.error(DEBUG, msg='receiving data...')

                try:
                    yield from self.receive()
                except BufferLimitReachedError as error:
                    log.error(ERROR, msg=error)
                    yield from self.send_meta(b'503')
                    return
                except socket.timeout:
                    log.error(DEBUG, msg='timeout while receiving from client')
                    yield from self.send_meta(b'408')
                    return

                log.error(DEBUG, var_name='_msg_buffer',
                          var_value=self._msg_buffer)

                self._req_meta_raw += self._msg_buffer

                if len(self._msg_buffer) <= 0:
                    log.error(DEBUG, msg='connection closed by peer')
                    self.state = ClientConnection.State.CLOSED
                    return

                if self._req_meta_raw.find(b'\r\n\r\n') != -1:
                    log.error(DEBUG, msg='reached end of request meta')
                    self._msg_buffer = self._req_meta_raw.split(b'\r\n\r\n', 1)[1]
                    break
            else:
                log.error(DEBUG, msg='request message too long')

                yield from self.send_meta(b'400')
                return

            log.error(DEBUG, msg='parsing request message...')

            self.req_meta = HTTP1_1MsgFormatter.parse_req_meta(self._req_meta_raw)

            if self.req_meta is None:
                log.error(DEBUG, msg='invalid request')
                yield from self.send_meta(b'400')
                return

            log.error(DEBUG, var_name='request meta',
                      var_value=self.req_meta)
        finally:
            self._monit.mark_end('receive_meta')

    def receive(self):
        log.error(DEBUG, msg='conn receive')

        assert self.state == ClientConnection.State.RECEIVING

        yield (self._conn, select.EPOLLIN)

        self._msg_buffer = b''

        try:
            while len(self._msg_buffer) <= CONFIG['msg_buffer_limit']:
                log.error(DEBUG, msg='loop conn receive')

                if CONFIG['ssl']:
                    recv_flags = 0
                else:
                    recv_flags = socket.MSG_DONTWAIT

                data = self._conn.recv(CONFIG['recv_buffer'], recv_flags)

                if len(data) == 0:
                    break

                log.error(DEBUG, msg='Received data loop conn:')
                log.error(DEBUG, msg=data)

                self._msg_buffer += data
            else:
                raise BufferLimitReachedError('msg_buffer_limit reached')

        except ssl.SSLWantReadError:
            log.error(DEBUG, msg='rcv would block')
        except OSError as error:
            assert error.errno==errno.EWOULDBLOCK
            log.error(DEBUG, msg='recv would block')
        finally:
            log.error(DEBUG, msg='End of receive')

    def send_meta(self, status_code, headers={}):
        log.error(DEBUG, msg='conn send_meta')
        self._monit.mark_begin('send_meta')

        log.error(DEBUG, var_name='status_code', var_value=status_code)
        log.error(DEBUG, var_name='headers', var_value=headers)

        try:
            assert type(status_code) is bytes
            assert type(headers) is dict

            log.error(DEBUG, var_name='state', var_value=self.state)

            if self.state in (
                ClientConnection.State.ESTABLISHED,
                ClientConnection.State.RECEIVING
            ):
                self.state = ClientConnection.State.SENDING

                self.res_meta.status_code = status_code
                result = HTTP1_1MsgFormatter.build_res_meta(status_code, headers)

                log.error(DEBUG, var_name='result', var_value=result)

                yield from self.send(result)
        finally:
            self._monit.mark_end('send_meta')

    def send(self, data):
        log.error(DEBUG, msg='conn send')

        assert isinstance(data, bytes)
        assert self.state == ClientConnection.State.SENDING

        log.error(DEBUG, var_name='data', var_value=data)

        total_bytes_sent = 0
        bytes_to_send = len(data)
        data_to_send = data

        while total_bytes_sent < bytes_to_send:
            yield (self._conn, select.EPOLLOUT)
            bytes_sent = self._conn.send(data_to_send)

            if bytes_sent == 0:
                # TODO error
                log.error(DEBUG, var_name='bytes_sent', var_value=bytes_sent)

            total_bytes_sent += bytes_sent
            data_to_send = data[total_bytes_sent:]

    def serve_static_file(self, file_path):
        log.error(DEBUG, msg='conn serve_static_file')
        self._monit.mark_begin('serve_static')

        try:
            assert self.state == ClientConnection.State.RECEIVING

            fd = None

            try:
                if not os.path.isfile(file_path):
                    yield from self.send_meta(b'404')
                    return

                try:
                    fd = os.open(file_path, os.O_RDONLY | os.O_NONBLOCK)
                except FileNotFoundError as error:
                    log.error(DEBUG, msg=error)
                    yield from self.send_meta(b'404')
                    return
                except IsADirectoryError as error:
                    log.error(DEBUG, msg=error)

                    yield from self.send_meta(b'404')
                    return

                log.error(DEBUG, msg='requested file opened')

                self.res_meta.headers[b'Content-Length'] = bytes(
                    str(os.path.getsize(file_path)),
                    'utf-8'
                )

                yield from self.send_meta(b'200', self.res_meta.headers)

                self.res_meta.packages_sent = 1

                while True:
                    response = os.read(fd, CONFIG['read_buffer'])
                    log.error(DEBUG, var_name='response', var_value=response)

                    if len(response) <= 0:
                        log.error(DEBUG, msg='end of file reached while reading')
                        break

                    log.error(DEBUG,
                              msg=('sending response.. ' +
                                   'response_packages_sent: ' +
                                   '{0}'.format(self.res_meta.packages_sent)))

                    yield from self.send(response)
            finally:
                if fd is not None:
                    try:
                        os.close(fd)
                    except Exception as error:
                        log.error(DEBUG, msg=error)
        finally:
            self._monit.mark_end('serve_static')

    def serve_cgi_script(self, file_path):
        log.error(DEBUG, msg='conn serve_cgi_script')
        self._monit.mark_begin('serve_cgi')

        try:
            assert self.state == ClientConnection.State.RECEIVING

            cgi_env = CGIMsgFormatter.build_cgi_env(self.req_meta,
                                                    self.remote_addr)

            child_read, parent_write = os.pipe()
            parent_read, child_write = os.pipe()

            fcntl.fcntl(parent_read, fcntl.F_SETFL, os.O_NONBLOCK)
            fcntl.fcntl(parent_write, fcntl.F_SETFL, os.O_NONBLOCK)

            pid = os.fork()

            if pid == 0:  # child process
                try:
                    os.dup2(child_read, sys.stdin.fileno(), inheritable=True)
                    os.dup2(child_write, sys.stdout.fileno(), inheritable=True)
                    os.close(parent_read)
                    os.close(parent_write)

                    for key, value in cgi_env.items():
                        assert isinstance(key, str)
                        assert isinstance(value, str)

                    try:
                        os.execve(file_path, [file_path], cgi_env)
                    except FileNotFoundError:
                        log.error(DEBUG, msg='CGI script not found')
                        log.error(DEBUG, var_name='file_path', var_value=file_path)
                        os._exit(os.EX_NOINPUT)
                except OSError as error:
                    log.error(DEBUG, msg='OSError thrown at cgi')
                    log.error(ERROR, msg=error)
                    os._exit(os.EX_OSERR)
                except Exception as error:
                    log.error(ERROR, msg=(str(error) + str(traceback.format_exc)))
                    os._exit(os.EX_SOFTWARE)
                finally:  # this should never run
                    err_msg = ('Unexpected condition. exec* function did not ' +
                               'run before finally.'),
                    log.error(ERROR, msg=(str(err_msg) + str(traceback.format_exc)))
                    os._exit(os.EX_SOFTWARE)
            else:  # parent process
                log.error(DEBUG, msg='New child created with pid {0}'.format(pid))

                cgi_handler = None

                try:
                    os.close(child_read)
                    os.close(child_write)

                    log.error(DEBUG, msg='closed fds of child')

                    cgi_handler = CGIHandler(parent_read, parent_write, pid)

                    signal.signal(signal.SIGALRM, cgi_handler.kill)
                    signal.alarm(CONFIG['cgi_timeout'])

                    log.error(DEBUG, msg='set alarm for {0} seconds'.format(CONFIG['cgi_timeout']))

                    if 'CONTENT_LENGTH' in cgi_env:
                        # sending remaining received from receive_meta bytes, which are
                        # not meta, but part of the body
                        yield from cgi_handler.send(self._msg_buffer)

                        content_length = int(cgi_env['CONTENT_LENGTH'])

                        log.error(DEBUG, msg='before write to cgi loop')
                        log.error(DEBUG, var_name='bytes_written',
                                  var_value=cgi_handler.bytes_written)
                        log.error(DEBUG, var_name='content_length',
                                  var_value=content_length)

                        while cgi_handler.bytes_written < content_length:
                            try:
                                yield from self.receive()
                            except BufferLimitReachedError as error:
                                log.error(ERROR, msg=error)
                                yield from self.send_meta(b'503')
                                return
                            except socket.timeout:
                                log.error(DEBUG,
                                          msg='timeout while receiving from client')
                                yield from self.send_meta(b'408')
                                return

                            log.error(DEBUG, var_name='_msg_buffer',
                                      var_value=self._msg_buffer)

                            if len(self._msg_buffer) <= 0:
                                log.error(DEBUG, msg='connection closed by peer')
                                return

                            yield from cgi_handler.send(self._msg_buffer)

                    log.error(DEBUG, msg='receiving CGI meta')

                    try:
                        yield from cgi_handler.receive_meta()
                    except BufferLimitReachedError as error:
                        log.error(ERROR, msg=error)
                        yield from self.send_meta(b'503')
                        return

                    if cgi_handler.cgi_res_meta_raw is None:
                        log.error(DEBUG, msg='cgi_res_meta_raw is None')
                        yield from self.send_meta(b'502')
                        return

                    log.error(DEBUG, msg='parsing CGI meta...')

                    res_headers = CGIMsgFormatter.parse_cgi_res_meta(
                        cgi_handler.cgi_res_meta_raw
                    )

                    if res_headers is None:
                        log.error(DEBUG, msg='res_headers is None')
                        yield from self.send_meta(b'502')
                        return

                    excluded_cgi_headers = ['Status']
                    http_headers = {}

                    for header_name, header_val in res_headers.items():
                        if header_name not in excluded_cgi_headers:
                            http_headers[header_name] = header_val

                    if 'Status' in res_headers and res_headers['Status'] in HTTP1_1MsgFormatter.response_reason_phrases.keys():
                        yield from self.send_meta(res_headers['Status'], http_headers)
                    else:
                        yield from self.send_meta(b'200', http_headers)

                    if len(cgi_handler.msg_buffer) > 0:
                        yield from self.send(cgi_handler.msg_buffer)

                    while True:
                        try:
                            yield from cgi_handler.receive()
                        except BufferLimitReachedError as error:
                            log.error(ERROR, msg=error)
                            return

                        if len(cgi_handler.msg_buffer) <= 0:
                            log.error(DEBUG,
                                      msg='end of cgi response reached while reading')
                            break

                        log.error(DEBUG, msg='sending response..')

                        yield from self.send(cgi_handler.msg_buffer)
                except OSError as error:
                    if error.errno == errno.EPIPE:
                        log.error(DEBUG, msg=error)
                        log.error(DEBUG, msg=traceback.format_exc())
                        yield from self.send_meta(b'502')
                    else:
                        raise error
                finally:
                    self.cgi_script_pid = pid
                    signal.alarm(0)

                    if cgi_handler is not None:
                        cgi_handler.close()

                    log.error(DEBUG, msg='All CGI data received from child {0}'.format(self.cgi_script_pid))
        finally:
            self._monit.mark_end('serve_cgi')

    def shutdown(self):
        log.error(DEBUG, msg='conn shutdown')
        self._conn.shutdown(socket.SHUT_RDWR)

    def close(self):
        log.error(DEBUG, msg='conn close')

        self._conn.close()
        self.state = ClientConnection.State.CLOSED
        self._monit.mark_end('connection')

        return self._monit
