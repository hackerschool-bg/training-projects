import os
import select
import signal
from config import CONFIG
from log import log, DEBUG
from http_meta import RequestMeta


class CGIMsgFormatter:
    @staticmethod
    def parse_cgi_res_meta(msg):
        log.error(DEBUG)

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
        log.error(DEBUG)

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
        log.error(DEBUG)

        bytes_written = 0
        bytes_to_write = len(data)
        data_to_write = data

        # TODO ask whether this while loop is OK
        # could the server get stuck in it and/or waste CPU?
        while bytes_written < bytes_to_write:
            yield (self._write_fd, select.POLLOUT)
            bytes_written += os.write(self._write_fd, data_to_write)
            data_to_write = data[bytes_written:]

        self.bytes_written += bytes_written

    def receive(self):
        log.error(DEBUG)

        yield (self._read_fd, select.POLLIN)
        self.msg_buffer = os.read(self._read_fd, CONFIG['read_buffer'])

    def receive_meta(self):
        log.error(DEBUG)

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
            self.cgi_res_meta_raw = None  # TODO refactor this

    def kill(self, signum, frame):
        log.error(DEBUG)

        os.kill(self._script_pid, signal.SIGTERM)
