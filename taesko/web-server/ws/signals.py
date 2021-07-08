import os
import signal as siglib
# noinspection PyUnresolvedReferences
from signal import (SIGKILL, SIGSTOP, SIGTERM, SIGUSR1, SIGCHLD, Signals,
                    SIG_DFL, SIG_IGN)

from ws.logs import error_log
from ws.err import SignalReceivedException


def signal(signum, handler):
    signame = siglib.Signals(signum).name
    error_log.info('Setting handler of %s to %s', signame, handler)
    siglib.signal(signum, handler)


def kill(pid, signum):
    signame = siglib.Signals(signum).name
    error_log.info('Sending %s to pid %s.', signame, pid)
    os.kill(pid, signum)


def raising_signal_handler(signum, stack_info):
    error_log.info('Received signum %s in raising signal handler.', signum)
    signame = siglib.Signals(signum).name
    raise SignalReceivedException(msg='Received signal {}'.format(signame),
                                  code='DEFAULT_HANDLER_CAUGHT_SIGNAL',
                                  signum=signum)


def reset_handlers(excluding=frozenset()):
    catchable = frozenset(siglib.Signals) - {SIGKILL, SIGSTOP}
    catchable -= frozenset(excluding)
    for sig in catchable:
        signal(sig, SIG_DFL)
