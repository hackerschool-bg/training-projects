import os
import socket
import select
import traceback
import errno
import ssl
from profiler import Profiler
from http_meta import RequestMeta
from log import log, DEBUG, ERROR
from uid import UID
from config import CONFIG
from client_connection import ClientConnection
from web_server_utils import resolve_static_file_path, resolve_cgi_file_path


class Worker:
    def __init__(self, socket):
        log.error(DEBUG, msg='worker __init__')

        self._socket = socket
        self._epoll = select.epoll()
        self._profiler = Profiler()
        self._activity_iterators = {}
        self._child_pids = []
        self._client_conns = []
        self._socket.setblocking(False)

    def start(self):
        log.error(DEBUG, msg='worker start')

        if CONFIG['chroot']:
            os.chroot(CONFIG['web_server_root'])

        os.setreuid(UID, UID)

        self._epoll.register(self._socket, select.EPOLLIN | select.EPOLLET)

        # self._profiler.mark_event_loop_begin_time()
        # self._profiler.mark_registering_begin()

        while True:
            # self._profiler.mark_event_loop_end()
            # self._profiler.mark_registering_end()
            log.error(DEBUG, msg='going to poll...')
            action_requests = self._epoll.poll()
            # self._profiler.mark_event_loop_begin_time()
            # self._profiler.mark_registering_begin()

            for fd, eventmask in action_requests:
                if fd == self._socket.fileno():
                    log.error(DEBUG, msg='accepting connections...')

                    try:
                        accepted_connections = 0

                        while True:
                            try:
                                log.error(DEBUG, msg='going to accept...')
                                # TODO fix when SSL enabled, when client
                                # connects with http from browser, accept
                                # blocks
                                conn, addr = self._socket.accept()
                                log.error(DEBUG, msg='conn accepted')
                            except OSError as error:
                                if error.errno == 0:
                                    # https://bugs.python.org/issue31122
                                    log.error(DEBUG, msg='ERRNO 0')
                                    continue
                                else:
                                    raise error
                            except ssl.SSLError as error:
                                log.error(DEBUG, msg='SSL error thrown at accept')
                                log.error(DEBUG, msg=error)
                                continue

                            if accepted_connections > CONFIG['accept_conn_limit']:
                                conn.close()
                                continue

                            conn.setblocking(False)

                            accepted_connections += 1

                            log.error(DEBUG, msg='connection accepted')
                            log.error(DEBUG, var_name='conn', var_value=conn)
                            log.error(DEBUG, var_name='addr', var_value=addr)

                            self.register_activity(
                                conn,
                                select.EPOLLIN,
                                self.req_handler(ClientConnection(conn, addr))
                            )
                    except OSError as error:
                        if error.errno == errno.EMFILE:
                            log.error(ERROR, msg=error)
                            os._exit(os.EX_UNAVAILABLE)
                        elif error.errno == errno.EWOULDBLOCK:
                            log.error(DEBUG, msg='accept going to block')
                        else:
                            log.error(DEBUG, msg='OSError thrown at accept')
                            log.error(DEBUG, msg=traceback.format_exc())
                            log.error(ERROR, msg=error)
                    finally:
                        log.error(DEBUG, msg='Accepted {0} connections'.format(accepted_connections))
                else:
                    assert fd in self._activity_iterators

                    activity_iter = self._activity_iterators[fd]

                    # self._profiler.mark_event_loop_end()
                    # self._profiler.mark_registering_end()
                    result = next(activity_iter, None)
                    # self._profiler.mark_event_loop_begin_time()
                    # self._profiler.mark_registering_begin()

                    assert result is None or isinstance(result, tuple)

                    # self._profiler.mark_registering_begin()

                    if isinstance(result, tuple):
                        assert len(result) == 2

                        log.error(DEBUG, msg=result)
                        new_fd, new_eventmask = result

                        # if (new_fd != fd or new_eventmask != eventmask):
                        self.unregister_activity(fd)
                        self.register_activity(new_fd, new_eventmask,
                                               activity_iter)
                    else:
                        self.unregister_activity(fd)
                # self._profiler.mark_registering_end()

            # self._profiler.mark_event_loop_iteration(action_requests)

    def register_activity(self, fd, eventmask, it):
        log.error(DEBUG, msg='register_activity')

        if isinstance(fd, socket.socket):
            fd = fd.fileno()

        self._epoll.register(fd, eventmask | select.EPOLLET)
        self._activity_iterators[fd] = it

    def unregister_activity(self, fd):
        log.error(DEBUG, msg='unregister_activity')

        self._epoll.unregister(fd)
        del self._activity_iterators[fd]

    def req_handler(self, client_conn):
        conn = None

        try:
            log.error(DEBUG, msg='req_handler')

            assert isinstance(client_conn, ClientConnection)

            conn = client_conn
            self._client_conns.append(conn)

            # may send response to client in case of invalid
            # request
            yield from client_conn.receive_meta()

            if client_conn.state != (
                ClientConnection.State.RECEIVING
            ):
                return

            log.error(DEBUG, msg='resolving file_path...')

            log.error(DEBUG, var_name='req_meta', var_value=client_conn.req_meta)
            log.error(DEBUG, msg=type(client_conn.req_meta))
            assert isinstance(client_conn.req_meta, RequestMeta)
            assert isinstance(client_conn.req_meta.target, str)

            # ignoring query params
            req_target_path = client_conn.req_meta.target.split('?', 1)[0]
            log.error(DEBUG, var_name='req_target_path',
                      var_value=req_target_path)

            file_path = os.path.realpath(req_target_path)

            log.error(DEBUG, var_name='file_path', var_value=file_path)

            log.error(DEBUG, msg='requested file in web server document root')

            # TODO make cgi-bin not accessible

            if file_path.startswith(CONFIG['cgi_dir']):
                yield from client_conn.serve_cgi_script(
                    resolve_cgi_file_path(file_path)
                )

                if client_conn.cgi_script_pid is not None:
                    self._child_pids.append(client_conn.cgi_script_pid)

                if len(self._child_pids) >= CONFIG['cgi_wait_batch_size']:
                    self.children_pid_wait()
            else:
                yield from client_conn.serve_static_file(
                    resolve_static_file_path(file_path)
                )
        except OSError as error:
            log.error(DEBUG, msg='OSError thrown at req_handler')
            log.error(DEBUG, msg=traceback.format_exc())
            log.error(DEBUG, msg=error)
        except Exception as error:
            log.error(ERROR, msg=str(error) + str(traceback.format_exc()))
            yield from client_conn.send_meta(b'500')
        finally:
            if conn is not None:
                self._client_conns.remove(conn)

            try:
                client_conn.shutdown()
            except OSError as error:
                if error.errno != errno.ENOTCONN:
                    raise error

            client_conn_monit = client_conn.close()

            if len(self._profiler._client_conn_monits) >= CONFIG['max_monits']:
                # log.error(ERROR,
                #          var_name='averages',
                #          var_value=self._profiler.get_averages())
                # TODO it should be ERROR only for dev purposes
                #log.error(ERROR,
                #          var_name='event_loop_time',
                #          var_value=self._profiler._event_loop_time.microseconds)
                #log.error(ERROR,
                #          var_name='event loop iterations length',
                #          var_value=len(self._profiler._event_loop_iterations))
                #log.error(ERROR,
                #          var_name='unsuccessful locks',
                #          var_value=self._profiler._unsuccessful_locks)
                #log.error(ERROR,
                #          var_name='registering time',
                #          var_value=self._profiler._registering_time.microseconds)

                self._profiler = Profiler()

            self._profiler.add_monit(client_conn_monit)

            if client_conn.req_meta is None:
                req_line = None
                user_agent = None
            else:
                req_line = client_conn.req_meta.req_line_raw
                user_agent = client_conn.req_meta.user_agent

            log.access(
                remote_addr='{0}:{1}'.format(client_conn.remote_addr,
                                             client_conn.remote_port),
                req_line=req_line,
                user_agent=user_agent,
                status_code=client_conn.res_meta.status_code,
                content_length=client_conn.res_meta.headers.get(b'Content-Length'),
            )

    def children_pid_wait(self):
        completed_process_ids = []

        for child_pid in self._child_pids:
            assert isinstance(child_pid, int)

            pid, status = os.waitpid(child_pid, os.WNOHANG)

            assert pid == child_pid or pid == 0

            if pid == child_pid:
                completed_process_ids.append(child_pid)
                log.error(DEBUG, msg=('child {0} exited.'.format(pid) +
                                      ' exit_status: {0}'.format(status)))

        for completed_process_id in completed_process_ids:
            self._child_pids.remove(completed_process_id)

    def stop(self):
        log.error(DEBUG, 'worker stop')
        self._socket.close()
        self._accept_lock_fd.close()
