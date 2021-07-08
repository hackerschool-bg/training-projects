#!/usr/bin/python3

import os
import sys
import time


PID_FILE = '/var/run/system_hello.pid'


def main():
    while True:
        print("Hello world", file=sys.stdout, flush=True)
        print("Hello errors.", file=sys.stderr, flush=True)
        time.sleep(60 * 60);


if __name__ == '__main__':
    try:
        with open(PID_FILE, mode='w') as f:
            f.write(str(os.getpid()));
    except PermissionError:
        print("ERROR: This script must be run with root permissions",
                file=sys.stderr)
        sys.exit(1)

    main()
