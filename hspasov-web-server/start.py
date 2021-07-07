import os
import sys


def start():
    # TODO ask are imports inside function OK?
    # they are inside this function because logging is initilized when
    # log is imported. Logging should not be initialized until running this
    # function
    import traceback
    from config import CONFIG
    from log import log, ERROR, DEBUG
    from server import Server

    log.error(DEBUG, var_name='config', var_value=CONFIG)

    server = Server()

    try:
        server.run()
    except OSError as error:
        log.error(DEBUG, msg='OSError thrown while initializing web server')
        log.error(ERROR, msg=error)
    except AssertionError as error:
        log.error(DEBUG, msg='AssertionError thrown')
        log.error(ERROR, msg=str(error) + str(traceback.format_exc()))
    except Exception as error:
        log.error(DEBUG, msg='Exception thrown')
        log.error(ERROR, msg=str(error) + str(traceback.format_exc()))
    finally:
        server.stop()


if __name__ == '__main__':
    pid = os.fork()

    if pid == 0:  # child process
        # TODO ask is the order of the steps for turning a process into daemon
        # important?
        os.umask(0)  # TODO ask is 0 ok?
        os.setsid()
        os.chdir('/')

        dev_null_fd = os.open('/dev/null', os.O_RDWR)

        os.dup2(dev_null_fd, sys.stdin.fileno(), inheritable=False)
        os.dup2(dev_null_fd, sys.stdout.fileno(), inheritable=False)

        os.close(dev_null_fd)

        start()
    else:  # parent process
        os._exit(os.EX_OK)
