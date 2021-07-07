import os
import errno
import select
import signal
from config import CONFIG
from log import log, DEBUG
from http_meta import RequestMeta
from error_handling import BufferLimitReachedError


class CGIMsgFormatter:
    @staticmethod
    def parse_cgi_res_meta(msg):
        log.error(DEBUG, msg='parse_cgi_res_meta')

        headers_raw = msg.split(b'\n\n', 1)[0]
        header_lines = headers_raw.split(b'\n')

        res_headers = {}

        for header_line in header_lines:
            header_split = header_line.split(b':', 1)

            if len(header_split) != 2:
                return None

            header_name, header_value = header_split

            res_headers[header_name] = header_value.strip()

        return res_headers

    @staticmethod
    def build_cgi_env(req_meta, remote_addr):
        log.error(DEBUG, msg='build_cgi_env')

        assert isinstance(req_meta, RequestMeta)
        assert isinstance(req_meta.method, bytes)
        assert (isinstance(req_meta.query_string, str) or
                req_meta.query_string is None)
        assert isinstance(remote_addr, str)
        assert isinstance(CONFIG['protocol'], str)

        cgi_env = {
            'GATEWAY_INTERFACE': 'CGI/1.1',
            'QUERY_STRING': req_meta.query_string or '',
            'REMOTE_ADDR': remote_addr,
            'REQUEST_METHOD': req_meta.method.decode(),
            'SERVER_PORT': str(CONFIG['port']),
            'SERVER_PROTOCOL': CONFIG['protocol'],
        }

        if b'Content-Length' in req_meta.headers:
            assert isinstance(req_meta.headers[b'Content-Length'], bytes)
            cgi_env['CONTENT_LENGTH'] = req_meta.headers[b'Content-Length'].decode()  # noqa

        log.error(DEBUG, var_name='cgi_env', var_value=cgi_env)

        return cgi_env


class CGIHandler:
    def __init__(self, read_fd, write_fd, script_pid):
        self._read_fd = read_fd
        self._write_fd = write_fd
        self._script_pid = script_pid
        self.msg_buffer = b''
        self.bytes_written = 0
        self.cgi_res_meta_raw = b''

    def send(self, data):
        log.error(DEBUG, msg='CGIHandler send')

        bytes_written = 0
        bytes_to_write = len(data)
        data_to_write = data

        while bytes_written < bytes_to_write:
            yield (self._write_fd, select.EPOLLOUT)

            try:
                while bytes_written < bytes_to_write:
                    log.error(DEBUG, msg='loop cgi send')

                    bytes_written += os.write(self._write_fd, data_to_write)
                    data_to_write = data[bytes_written:]
            except OSError as error:
                assert error.errno in (errno.EWOULDBLOCK, errno.EPIPE)

                if error.errno == errno.EPIPE:
                    raise error

                log.error(DEBUG, msg='write to cgi would block')

        self.bytes_written += bytes_written

    def receive(self):
        log.error(DEBUG, msg='CGIHandler receive')

        yield (self._read_fd, select.EPOLLIN)

        self.msg_buffer = b''

        try:
            while len(self.msg_buffer) <= CONFIG['msg_buffer_limit']:
                log.error(DEBUG, msg='loop cgi receive')

                data = os.read(self._read_fd, CONFIG['read_buffer'])

                if len(data) == 0:
                    break

                self.msg_buffer += data

                log.error(DEBUG, var_name='data', var_value=data)
                log.error(DEBUG, msg=data)
            else:
                raise BufferLimitReachedError('msg_buffer_limit reached')
        except OSError as error:
            assert error.errno in (errno.EWOULDBLOCK, errno.EBADF)

            if error.errno == errno.EWOULDBLOCK:
                log.error(DEBUG, msg='read from cgi would block')
        finally:
            log.error(DEBUG, msg='End of receive')

    def receive_meta(self):
        log.error(DEBUG, msg='CGIHandler receive_meta')

        while len(self.cgi_res_meta_raw) <= CONFIG['cgi_res_meta_limit']:
            log.error(DEBUG, msg='collecting data from cgi...')

            yield from self.receive()

            self.cgi_res_meta_raw += self.msg_buffer

            if len(self.msg_buffer) <= 0:
                log.error(DEBUG, msg='No data to read.')
                break

            if self.cgi_res_meta_raw.find(b'\n\n') != -1:
                log.error(DEBUG, msg='finished collecting meta data from cgi')
                self.msg_buffer = self.cgi_res_meta_raw.split(b'\n\n', 1)[1]
                break
        else:
            log.error(DEBUG, msg='cgi response meta too long')
            self.cgi_res_meta_raw = None

    def kill(self, signum, frame):
        log.error(DEBUG, msg='CGIHandler kill')

        os.kill(self._script_pid, signal.SIGTERM)

    def close(self):
        log.error(DEBUG, msg='CGIHandler close')

        os.close(self._read_fd)
        os.close(self._write_fd)
