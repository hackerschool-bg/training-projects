import ws.auth
import ws.cworker
import ws.http.utils as hutils
import ws.ratelimit
import ws.sockets
import ws.signals
import ws.serve
from ws.err import *
from ws.config import config
from ws.logs import error_log, access_log


class Worker:
    def __init__(self, fd_transport, parent_ctx=None):
        parent_ctx = parent_ctx or {}

        assert isinstance(fd_transport, ws.sockets.FDTransport)
        assert isinstance(parent_ctx, collections.Mapping)

        self.connections = collections.deque()
        self.request_stats = collections.defaultdict(lambda: {'total': 0,
                                                              'count': 0})
        self.parent_ctx = parent_ctx
        self.fd_transport = fd_transport
        self.rate_controller = ws.ratelimit.HTTPRequestRateController()
        self.auth_scheme = ws.auth.BasicAuth()
        self.static_files = ws.serve.StaticFiles()
        self.static_files.reindex_files()
        ws.signals.signal(ws.signals.SIGUSR1,
                          self.static_files.schedule_reindex)

        if config.getboolean('ssl', 'enabled'):
            cert_file = config['ssl']['cert_file']
            purpose = ws.sockets.Purpose.CLIENT_AUTH
            self.ssl_ctx = ws.sockets.create_default_ssl_context(purpose)
            self.ssl_ctx.load_cert_chain(certfile=cert_file)
        else:
            self.ssl_ctx = None

    def recv_new_sockets(self):
        error_log.debug3('Receiving new sockets through fd transport.')

        msg, fds = self.fd_transport.recv_fds()

        for fd in fds:
            error_log.debug3('Received file descriptor %s', fd)
            sock = ws.sockets.Socket(fileno=fd)
            self.connections.append((sock, sock.getpeername()))

    def work(self):
        error_log.info('Entering endless loop of processing sockets.')

        while True:
            sock, address = (None, None)

            # noinspection PyBroadException
            try:
                if not self.connections:
                    self.recv_new_sockets()

                sock, address = self.connections.popleft()
                self.handle_connection(socket=sock, address=address)
            except SignalReceivedException as err:
                if err.signum == ws.signals.SIGTERM:
                    error_log.info('Breaking work() loop due to signal %s.',
                                   ws.signals.Signals(err.signum).name)
                    break
                else:
                    error_log.exception('Unknown signal during work() loop')
            except KeyboardInterrupt:
                break
            except Exception:
                error_log.exception('Exception occurred during work() loop.')
                continue
            finally:
                if sock:
                    sock.shutdown(ws.sockets.SHUT_RDWR, pass_silently=True)
                    sock.close(pass_silently=True)

        # noinspection PyUnreachableCode
        self.cleanup()

        return 0

    def cleanup(self):
        error_log.info('Cleaning up... %s total leftover connections.',
                       len(self.connections))
        self.fd_transport.discard()

        for sock, address in self.connections:
            # noinspection PyBroadException
            try:
                res = hutils.build_response(503)
                self.handle_connection(socket=sock, address=address,
                                       quick_reply_with=res)
            except Exception:
                error_log.exception('Error while cleaning up client on '
                                    '%s / %s', sock, address)
            finally:
                sock.close(pass_silently=True)

    def handle_connection(self, socket, address, quick_reply_with=None,
                          ssl_only=config.getboolean('ssl', 'strict')):
        assert isinstance(socket, ws.sockets.Socket)
        assert isinstance(address, collections.Sequence)

        error_log.debug3('handle_connection()')

        if self.rate_controller.is_banned(address[0]):
            socket.close(pass_silently=True)
            return

        wrapped_sock = socket

        if self.ssl_ctx:
            if socket.client_uses_ssl():
                wrapped_sock = ws.sockets.SSLSocket.from_sock(
                    sock=socket, context=self.ssl_ctx, server_side=True
                )
            elif ssl_only:
                quick_reply_with = hutils.build_response(403)
            else:
                error_log.info('Client on %s / %s does not use SSL/TLS',
                               socket, address)

        conn_worker = ws.cworker.ConnectionWorker(
            sock=wrapped_sock,
            address=address,
            auth_scheme=self.auth_scheme,
            static_files=self.static_files,
            worker_ctx={'request_stats': self.request_stats}
        )
        try:
            with conn_worker:
                conn_worker.process_connection(
                    quick_reply_with=quick_reply_with)
        finally:
            self.rate_controller.record_handled_connection(
                ip_address=address[0],
                status_codes=conn_worker.status_codes()
            )
            for exchange_stats in conn_worker.generate_stats():
                for stat_name, val in exchange_stats.items():
                    self.request_stats[stat_name]['total'] += val
                    self.request_stats[stat_name]['count'] += 1
            for exchange in conn_worker.exchanges:
                access_log.log(**exchange)
