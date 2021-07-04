import sys
klr = raw_input()
first = raw_input()
second = raw_input()


tokens = klr.split(" ")
rows = int(tokens[0]) #k
cols = int(tokens[1]) #l
days = int(tokens[2]) #r


if (rows<1) or (rows>1000):
    print('rows out of range')
    sys.exit()
if (cols<1) or (cols>1000):
    print('cols out of range')
    sys.exit()
if (days<1) or (days>100):
    print('days out of range')
    sys.exit()

matrix = []
for i in range(cols):
    row = [];
    for j in range(rows):
	row.append(0)
    matrix.append(row)

firstTokens = first.split(" ")
firstX = int(firstTokens[1]) - 1
firstY = int(firstTokens[0]) - 1
matrix[firstX][firstY] = 1

if second:
    secondTokens = second.split(" ")
    secondX = int(secondTokens[1]) - 1
    secondY = int(secondTokens[0]) - 1
    matrix[secondX][secondY] = 1

for k in range(days):
    for i in range(cols):
	for j in range(rows):
	    if matrix[i][j] == 1:
		try:
		    if matrix[i-1][j] == 0 and i>0:
		        matrix[i-1][j] = 2
		except Exception:
		    pass
		try:
		    if matrix[i+1][j] == 0 and i<cols:
		        matrix[i+1][j] = 2
		except Exception:
		    pass
		try:
		    if matrix[i][j-1] == 0 and j>0:
		        matrix[i][j-1] = 2
		except Exception:
		    pass
		try:
		    if matrix[i][j+1] == 0 and j<rows:
		        matrix[i][j+1] = 2
		except Exception:
		    pass
    
    for i in range(cols):
	for j in range(rows):
	    if matrix[i][j] == 2:
		matrix[i][j] = 1
count = 0;
for i in range(cols):
    for j in range(rows):
	if matrix[i][j] == 0:
	    count+=1

print(count)

