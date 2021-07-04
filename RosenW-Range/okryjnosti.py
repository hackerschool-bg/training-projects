import math
import collections

def intersects(c1, c2):
	distance = math.sqrt(((c1[0] - c2[0]) ** 2) + ((c1[1] - c2[1]) ** 2))
	if c1[2] >= c2[2] + distance or c2[2] >= c1[2] + distance:
		return False
	if ((c1[0] - c2[0]) ** 2) + ((c1[1] - c2[1]) ** 2) < ((c1[2] + c2[2]) ** 2):
		return True
	else:
		return False

stop = False
n = input()
if n < 2 or n > 1000:
	raise Exception('n out of range')

circles = []

for i in range(n):
	line = raw_input()
	line_tokens = line.split()
	cur_x = int(line_tokens[0])
	cur_y = int(line_tokens[1])
	cur_r = int(line_tokens[2])
	if cur_x <= -10000 or cur_x >= 10000 or cur_y <= -10000 or cur_y >= 10000 or cur_r <= 0 or cur_r >= 10000:
		raise Exception('invalid circle')
	circles.append((cur_x, cur_y, cur_r, i+1))

queue = collections.deque()
checked = []
queue.append(circles[0])
checked.append(circles[0][3])
count = 0
found = False
while len(queue) > 0:
	current_circle = queue.popleft()
	for circle in circles:
		if intersects(current_circle, circle) and circle[3] not in checked:
			queue.append(circle)
			checked.append(circle[3])
			if circle[3] == n:
				found = True
				print count+1
	count+=1

if not found:
	print -1