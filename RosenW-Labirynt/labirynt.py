import collections
import numpy as np
import sys

class Lab():
  def __init__(self):
    matrix = [
      [' ', ' ', ' ', '*', ' ', ' ', ' '],
      ['*', '*', ' ', '*', ' ', '*', ' '],
      [' ', ' ', ' ', ' ', ' ', ' ', ' '],
      [' ', '*', '*', '*', '*', '*', ' '],
      [' ', ' ', ' ', ' ', ' ', ' ', 'e']
    ]
    self.wall, self.clear, self.goal = "*", " ", "e"
    self.height, self.width = np.shape(matrix)
    result = self.bfs(matrix, (0,0))
    sys.stdout.write(str(result))

  def bfs(self, grid, start):
      queue = collections.deque([[start]])
      seen = set([start])
      while queue:
        path = queue.popleft()
        x, y = path[-1]
        if grid[y][x] == self.goal:
          return path
        for x2, y2 in ((x+1,y), (x-1,y), (x,y+1), (x,y-1)):
            if 0 <= x2 < self.width and 0 <= y2 < self.height and grid[y2][x2] != self.wall and (x2, y2) not in seen:
              queue.append(path + [(x2, y2)])
              seen.add((x2, y2))

lab = Lab()
