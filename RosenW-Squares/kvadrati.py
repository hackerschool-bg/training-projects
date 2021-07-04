def checkAllInBox(x1, y1, x2, y2):
    count = 0
    for i in range(x1, x2):
        for j in range(y1, y2):
            if matrix[i][j] == '0':

              rightPlace = True
              boxXStart = n*(i//n)
              boxXEnd = n + n*(i//n)
              boxYStart = n*(j//n)
              boxYEnd = n + n*(j//n)

              for k in range(boxXStart, boxXEnd): # test if symbol in square
                  for l in range(boxYStart, boxYEnd):
                    if matrix[k][l] == s:
                      rightPlace = False

              for k in range(size):
                if matrix[i][k] == s: # test if symbol in row
                  rightPlace = False

              for k in range(size):
                if matrix[k][j] == s: # test if symbol in col
                  rightPlace = False

              if rightPlace:
                count += 1
    return count

n = input()

if(n < 2 or n > 3):
    raise Exception('n out of range')

size = n**2

matrix = []

for i in range(size):
    line = raw_input().split()
    matrix.append(line)

symbols = []

print('start')

for i in range(size):
    for j in range(size):
      if matrix[i][j] not in symbols and matrix[i][j] != '0':
        symbols.append(matrix[i][j])

if(len(symbols) < size):
    raise Exception('not enough elements')

done = False
while not done:
  done = True
  for i in range(size):
      for j in range(size):
        if matrix[i][j] == '0':
          done = False

  for s in symbols:
    for i in range(size):
        for j in range(size):
            if matrix[i][j] == '0':
              rightPlace = True
              boxXStart = n*(i//n)
              boxXEnd = n + n*(i//n)
              boxYStart = n*(j//n)
              boxYEnd = n + n*(j//n)

              for k in range(boxXStart, boxXEnd): # test if symbol in square
                  for l in range(boxYStart, boxYEnd):
                    if matrix[k][l] == s:
                      rightPlace = False

              for k in range(size):
                if matrix[i][k] == s: # test if symbol in row
                  rightPlace = False

              for k in range(size):
                if matrix[k][j] == s: # test if symbol in col
                  rightPlace = False

              if rightPlace and checkAllInBox(boxXStart, boxYStart, boxXEnd, boxYEnd) == 1:
                matrix[i][j] = s
                print('assigning ' + s + ' to ' + str(i) + ' - ' + str(j))

print('solved')
for i in range(size):
    print(' '.join(matrix[i]))


# 2
# 0 0 1 2  # pass
# 0 0 0 0
# 3 0 0 0
# 0 1 0 4


# 3
# B Y 0 0 P 0 0 0 0 # pass
# L 0 0 R E B 0 0 0
# 0 E W 0 0 0 0 L 0
# W 0 0 0 L 0 0 0 Y
# G 0 0 W 0 Y 0 0 R
# P 0 0 0 O 0 0 0 L
# 0 L 0 0 0 0 O W 0
# 0 0 0 G R E 0 0 B
# 0 0 0 0 W 0 0 P E

# 3
# 0 0 9 0 0 0 0 3 7 # fail
# 0 0 2 4 0 0 0 0 0
# 7 0 5 0 6 8 0 9 0
# 8 0 3 0 0 2 0 5 0
# 0 0 0 1 0 0 0 0 3
# 4 0 0 0 8 0 0 0 0
# 0 7 0 0 0 5 0 0 6
# 1 0 0 0 0 0 0 0 0
# 0 0 0 0 4 7 2 0 0