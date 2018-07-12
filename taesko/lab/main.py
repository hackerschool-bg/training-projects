import argparse
import collections
from pprint import pprint


CORRIDOR = ' '
WALL = '*'
EXIT = 'e'


class PathGraph:
    def __init__(self, row, col, type, *connections):
        if len(connections) > 4:
            raise ValueError("Labirynth can't connect to more than 4 paths. Got: ", connections)

        self.row = row
        self.col = col
        self.type = type
        self.connections = [*connections]

        for conn in connections:
            conn.connect(self)

    def connect(self, path):
        rd = abs(self.row - path.row)
        cd = abs(self.col - path.col)

        if rd + cd > 1:
            raise ValueError('Path {} cannot connect to {} - they are not adjacent', self, path)

        if len(self.connections) > 3:
            raise ValueError('Path {} cannot connect to {} - former has too many connections', self, path)

        self.connections.append(path)

    @classmethod
    def from_arrays(cls, arrays):
        pass


    def __repr__(self):
        return "Path({self.row}, {self.col}, {self.type})".format(**locals())


Corridor = collections.namedtuple('Corridor', ['row', 'col', 'type'])


def adjacent_corridors(lab, corridor):
    row, col = (corridor.row, corridor.col)
    row_len = len(lab)
    col_len = len(lab[0])
    adjacent_indexes = [(row + 1, col),
                        (row - 1, col),
                        (row, col + 1),
                        (row, col - 1)]
    adjacent = (lab[r][c] for r, c in adjacent_indexes
                if 0 <= r < row_len and 0 <= c < col_len)

    for adj in adjacent:
        if adj.type in (EXIT, CORRIDOR):
            yield adj


def lab_from_arrays(arrays):
    lab = []

    for row_index, row in enumerate(arrays):
        lab_row = [Corridor(row_index, col_index, type_)
                   for col_index, type_ in enumerate(row)]
        lab.append(lab_row)

    return lab


def find_exit(lab, start):
    visited, queue = set(), collections.deque([[start]])
    print("start dfs: ", start)

    while queue:
        path = queue.popleft()
        last_corridor = path[-1]
        if last_corridor.type == EXIT:
            return path

        for adj in adjacent_corridors(lab, last_corridor):
            if adj not in visited:
                new_path = [*path, adj]
                queue.append(new_path)
                visited.add(adj)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('file')

    args = parser.parse_args()

    with open(args.file, mode='r') as f:
        lab = lab_from_arrays(eval(f.read()))
        pprint(lab)

    print("exit:\n", find_exit(lab, lab[0][0]), sep='')


if __name__ == '__main__':
    main()
