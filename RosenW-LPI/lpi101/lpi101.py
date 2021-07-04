import time
import os

with open("/var/run/myserv2/myserv2.pid", "w+") as file:
	file.write(str(os.getpid()))

while True:
	print("Time to write !")
	time.sleep(3600)