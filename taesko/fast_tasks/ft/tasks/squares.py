import argparse
import collections
import copy
import sys

Location = collections.namedtuple('Location', ['row', 'col'])


class ReachedContradiction(ValueError):
    pass


class SquareMap(collections.UserDict):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._side_len = None
        self._mini_square_len = None

    @property
    def side_len(self):
        assert self._side_len
        return self._side_len

    @side_len.setter
    def side_len(self, value):
        assert isinstance(value, int)
        self._side_len = value

    @property
    def mini_square_len(self):
        return self._mini_square_len

    @mini_square_len.setter
    def mini_square_len(self, value):
        assert isinstance(value, int)
        self._mini_square_len = value


def construct_square_map(mini_square_len, symbols):
    dct = SquareMap()
    length = mini_square_len * mini_square_len
    dct.side_len = length
    dct.mini_square_len = mini_square_len

    for row in range(length):
        for col in range(length):
            dct[Location(row, col)] = set(symbols)

    return dct


def insert_symbol(square_map, location, symbol):
    return remove_symbol_from_locations(
        square_map,
        locations_affected_by_location(square_map, location),
        symbol
    )


def remove_symbol_from_locations(square_map, locations, symbol):
    total_removed = 0
    modified = False
    for loc in locations:
        allowed = square_map[loc]

        assert len(allowed) > 0, 'got {allowed}'.format(**locals())
        if len(allowed) == 1 and symbol in allowed:
            raise ReachedContradiction('{symbol} is alone in {allowed}'.format(**locals()))

        try:
            allowed.remove(symbol)
            total_removed += 1
        except KeyError:
            pass

    return total_removed


def locations_affected_by_location(square_map, location):
    affected_rows = [Location(row, location.col) for row in range(square_map.side_len)]
    affected_cols = [Location(location.row, col) for col in range(square_map.side_len)]
    affected_square = []
    mini_square_len = square_map.mini_square_len
    square_row = mini_square_len * (location.row // mini_square_len)
    square_col = mini_square_len * (location.col // mini_square_len)
    for row in range(square_row, square_row+mini_square_len):
        for col in range(square_col, square_col+mini_square_len):
            affected_square.append(Location(row, col))

    affected = set(affected_rows + affected_cols + affected_square)
    affected.remove(location)
    return affected


def solve(square_map):
    finished, square_map, _ = eliminate(square_map)
    if finished:
        return True, square_map
    best_squares = []
    for loc, symbols in sorted(square_map.items(), key=lambda item: len(item[1])):
        for sym in symbols:
            if len(symbols) == 1:
                continue
            copied = copy.deepcopy(square_map)
            copied[loc].remove(sym)
            try:
                solved, result, eliminated = eliminate(copied)
            except ReachedContradiction:
                continue
            if solved:
                return True, result
            else:
                best_squares.append((eliminated, result))
    best_squares.sort(key=lambda e: e[0], reverse=True)
    for _, sm in best_squares:
        print('Number of best squares is', len(best_squares))
        solved, result = solve(sm)
        if solved:
            return True, result
    return False, None


def eliminate(square_map):
    total_eliminated = 0
    while True:
        modified_any = False
        finished = True
        for location, symbols in square_map.items():
            if len(symbols) == 1:
                symbol = next(iter(symbols))
                affected = locations_affected_by_location(square_map, location)
                modified_count = remove_symbol_from_locations(square_map, affected, symbol)
                total_eliminated += modified_count
                modified_any = modified_any or modified_count > 0
            else:
                finished = False
        if finished:
            return finished, square_map, total_eliminated
        elif not modified_any:
            return modified_any, square_map, total_eliminated


def parse_input_file(file):
    with open(file, mode='r', encoding='ascii') as f:
        text = f.read()

    print(text)
    lines = iter(text.splitlines(keepends=False))
    try:
        mini_square_length = int(next(lines))
    except TypeError:
        print('Invalid input file. Expected integer on the first line for number of symbols')
        sys.exit(1)
    if not (2 <= mini_square_length <= 3):
        print('Expected N to be either 2 or 3')
        sys.exit(2)
    if len(text.splitlines(keepends=False)) - 1 != mini_square_length*mini_square_length:
        print('Expected number of lines to be', mini_square_length*mini_square_length)
    symbol_loc_map = {}

    for row, line in enumerate(lines):
        symbols = [s for s in line.split() if s]
        for col, sym in enumerate(symbols):
            if sym == '0':
                continue
            symbol_loc_map[Location(row, col)] = sym

    all_symbols = set(symbol_loc_map.values())
    square_map = construct_square_map(mini_square_length, all_symbols)

    for loc, symbol in symbol_loc_map.items():
        insert_symbol(square_map, loc, symbol)

    return square_map


def print_square_map(square_map):
    def stringify_set(symbols):
        if len(symbols) == 1:
            return next(iter(symbols))
        else:
            return 'U'

    for row in range(square_map.side_len):
        line = []
        for loc, sym in square_map.items():
            if loc.row == row:
                line.append((loc, sym))
        line.sort()
        pretty = (stringify_set(e[1]) for e in line)
        print(' '.join(pretty))


def is_valid(square_map):
    for loc, symbols in square_map.items():
        sym = next(iter(symbols))
        affected = locations_affected_by_location(square_map, loc)
        for affected_loc in affected:
            if affected_loc == loc:
                continue
            if len(square_map[affected_loc]) != 1 or sym in square_map[affected_loc]:
                return False
    return True


def run(*, mini_square_side_length, marked_locations):
    assert 2 <= mini_square_side_length <= 3
    assert len(marked_locations) <= 81

    all_symbols = set(loc[2] for loc in marked_locations)

    assert (len(all_symbols) >= mini_square_side_length * mini_square_side_length)

    square_map = construct_square_map(mini_square_side_length, all_symbols)

    for row, col, symbol in marked_locations:
        insert_symbol(square_map, Location(row, col), symbol)

    solved, result = solve(square_map)

    assert solved

    return list(iter_rows(result, mini_square_side_length))


def iter_rows(solution, mini_square_side_length):
    cells = sorted(solution.items())
    column_count = mini_square_side_length * mini_square_side_length
    for row in range(column_count):
        row_cells = sorted(c for c in cells if c[0].row == row)
        print('row cells are', row_cells)
        yield [next(iter(c[1])) for c in row_cells]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('file')
    args = parser.parse_args()
    square_map = parse_input_file(args.file)
    solved, result = solve(square_map)
    if solved:
        print('Solution')
        print_square_map(result)
        sys.exit()
    else:
        print('Could not find solution')


if __name__ == '__main__':
    main()
