import time
import sys
import os

PIDFILE = '/var/run/iamworking.pid'
HOUR = 60 * 60

fptr = open(PIDFILE, 'w')
fptr.write(str(os.getpid()))
fptr.close()

while True:
	print("I am working", file=sys.stderr)
	time.sleep(HOUR)
