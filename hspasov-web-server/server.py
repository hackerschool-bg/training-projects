import os
import socket
import ssl
import signal
import traceback
from config import CONFIG
from log import log, DEBUG, ERROR
from worker import Worker


class Server:
    def __init__(self):
        log.error(DEBUG, msg='server __init__')

        if CONFIG['ssl']:
            self._socket = ssl.wrap_socket(
                socket.socket(socket.AF_INET, socket.SOCK_STREAM),
                certfile=CONFIG['ssl_certificate'],
                server_side=True
            )
        else:
            self._socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

        self._socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self._socket.setblocking(False)

        self._worker_pids = []

    def run(self):
        log.error(DEBUG, msg='server run')

        pid = None

        signal.signal(signal.SIGTERM, self.stop)

        self._socket.bind((CONFIG['host'], CONFIG['port']))
        log.error(DEBUG, msg='socket bound: {0}:{1}'.format(CONFIG['host'],
                                                            CONFIG['port']))

        self._socket.listen(CONFIG['backlog'])
        log.error(DEBUG,
                  msg='listening... backlog: {0}'.format(CONFIG['backlog']))

        while True:
            try:
                pid = os.fork()

                if pid == 0:  # child process
                    try:
                        signal.signal(signal.SIGTERM, signal.SIG_DFL)
                        # TODO ask if init_access_log_file fails, we get
                        # into an endless loop. But what could the
                        # alternative be? Stop the server? Count how
                        # often new worker is created and stop the server
                        # only when new workers are created too often?
                        log.init_access_log_file()

                        worker = Worker(self._socket)
                        worker.start()  # event loop
                    except Exception as error:
                        log.error(ERROR, msg=traceback.format_exc())
                        log.error(ERROR, msg=error)
                    finally:
                        os._exit(os.EX_SOFTWARE)
                else:  # parent process
                    self._worker_pids.append(pid)
                    log.error(DEBUG, msg='New worker created with pid {0}'.format(pid))  # noqa

                worker_pid, worker_exit_status = os.wait()

                log.error(ERROR, msg='Worker with pid {0} exited with status code {1}'.format(worker_pid, os.WEXITSTATUS(worker_exit_status)))  # noqa
                self._worker_pids.remove(worker_pid)
            finally:
                if pid is not None and pid == 0:
                    log.close_access_log_file()

    def stop(self, signal_number=None, stack_frame=None):
        for worker_pid in self._worker_pids:
            os.kill(worker_pid, signal.SIGTERM)

        os._exit(os.EX_OK)
