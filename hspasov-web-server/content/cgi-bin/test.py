#!/usr/bin/python3.6

import os
import sys

# TODO ask if cgi doesnt wait for all input data to come and exits and parent
# tries to write and gets broken pipe error and returns 502, is that an
# expected behaviour?
data = os.read(sys.stdin.fileno(), 1024)

print('Test:works')
print()
print(os.environ['CONTENT_LENGTH'])
print(data)
