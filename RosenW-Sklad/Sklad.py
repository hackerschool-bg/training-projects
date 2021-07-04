import sys
x = input()
if (x<1) or (x>100):
    print('N out of range')
    sys.exit()
count = 0
lines = 0
matrix = []
for i in range(x):
    line = raw_input().split()
    matrix.append(line)

def countVertLines(matrix, x):
    lines = 0
    for i in range(x):
	hasLine = True
        for j in range(x):
	    if matrix[i][j] == '1':
		hasLine = False
	if hasLine:
	    lines += 1;
    return lines

def countHorLines(matrix, x):
    lines = 0
    for i in range(x):
	hasLine = True
        for j in range(x):
	    if matrix[j][i] == '1':
		hasLine = False
	if hasLine:
	    lines += 1;
    return lines

def countDifferentIsles(matrix, x):
    products = 0
    if(x==1 and matrix[0][0] == '1'):
	return '1'
    for i in range(x):
        for j in range(x):
	    lastOne = True
	    if(matrix[i][j]=='1'):
		try:
		    if(matrix[i-1][j]=='1'):
	    	    	lastOne = False
		except Exception:
		    pass
		try:
		    if(matrix[i+1][j]=='1'):
	    	    	lastOne = False
		except Exception:
		    pass
		try:
		    if(matrix[i][j+1]=='1'):
	    	    	lastOne = False
		except Exception:
		    pass
		try:
		    if(matrix[i][j-1]=='1'):
	    	    	lastOne = False
		except Exception:
		    pass
		if(lastOne):
		    products += 1
		else:
		    matrix[i][j] = '0'
    return str(products)

paths = countVertLines(matrix, x) + countHorLines(matrix, x)
items = countDifferentIsles(matrix, x)
print(items + " " + str(paths))















