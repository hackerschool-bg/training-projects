n = int(input())

if(n < 2 or n > 3):
    raise Exception('n out of range')

size = n**2

initialMatrix = []
matrix = []
symbols = []

for i in range(size):
    line = input().split()
    newArray = []
    for x in range(len(line)):
        newArray.append(line[x])

    matrix.append(line)
    initialMatrix.append(newArray)

for i in range(size):
    for j in range(size):
      if matrix[i][j] not in symbols and matrix[i][j] != '0':
        symbols.append(matrix[i][j])

if(len(symbols) < size):
    raise Exception('not enough elements')

def isValid(x, y, s):
    valid = True
    boxXStart = n*(x//n)
    boxXEnd = n + n*(x//n)
    boxYStart = n*(y//n)
    boxYEnd = n + n*(y//n)

    for k in range(boxXStart, boxXEnd): # test if symbol in square
      for l in range(boxYStart, boxYEnd):
        if matrix[k][l] == s:
          valid = False

    for k in range(size):
        if matrix[x][k] == s: # test if symbol in row
          valid = False

    for k in range(size):
        if matrix[k][y] == s: # test if symbol in col
          valid = False

    return valid

def nextCoord(x, y):
    if x == size-1:
        return (0, y+1)
    else:
        return (x+1, y)

def dfs(x, y):
    nextXY = nextCoord(x, y)
    if(matrix[x][y] == '0'):
        for s in symbols:
            if isValid(x, y, s):
                matrix[x][y] = s
                if isSolved():
                    print('solved')
                    for i in range(size):
                        for j in range(size):
                            if matrix[i][j] == initialMatrix[i][j]:
                                print('\33[33;5;33m' + matrix[i][j] + '\33[0m', end=" | ")
                            else:
                                print('\33[32;5;32m' + matrix[i][j] + '\33[0m', end=" | ")
                        print('\n' + size*4*'-')
                else:
                    dfs(nextXY[0], nextXY[1])
        matrix[x][y] = '0'
    else:
        if x != size-1 or y != size-1:
            dfs(nextXY[0], nextXY[1])

def isSolved():
    solved = True
    for x in range(size):
        for y in range(size):
            if matrix[x][y] == '0':
                solved = False
    return solved

dfs(0, 0)

# 2
# 0 0 1 2
# 0 0 0 0
# 3 0 0 0
# 0 1 0 4

# 3
# B Y 0 0 P 0 0 0 0
# L 0 0 R E B 0 0 0
# 0 E W 0 0 0 0 L 0
# W 0 0 0 L 0 0 0 Y
# G 0 0 W 0 Y 0 0 R
# P 0 0 0 O 0 0 0 L
# 0 L 0 0 0 0 O W 0
# 0 0 0 G R E 0 0 B
# 0 0 0 0 W 0 0 P E

# 3
# 0 0 9 0 0 0 0 3 7
# 0 0 2 4 0 0 0 0 0
# 7 0 5 0 6 8 0 9 0
# 8 0 3 0 0 2 0 5 0
# 0 0 0 1 0 0 0 0 3
# 4 0 0 0 8 0 0 0 0
# 0 7 0 0 0 5 0 0 6
# 1 0 0 0 0 0 0 0 0
# 0 0 0 0 4 7 2 0 0

# 3
# 3 4 6 0 0 0 2 7 0
# 0 7 0 0 0 2 5 0 8
# 0 0 0 3 0 0 0 0 0
# 0 0 0 8 0 1 0 0 0
# 4 1 0 0 9 0 0 0 3
# 0 0 0 0 5 0 0 9 0
# 9 0 0 0 0 7 0 0 1
# 0 3 1 0 0 0 0 8 7
# 0 5 0 0 0 8 0 0 0