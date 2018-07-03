#!/usr/bin/python3
import argparse


class Berry:
    def __init__(self, infected, infected_now, row, col):
        self.infected = infected
        self.infected_now = infected_now
        self.row = row
        self.col = col

    @classmethod
    def from_bitmap(cls, bitmap):
        garden = []

        for row, infections in enumerate(bitmap):
            berries = []
            for col, infected_state in enumerate(infections):
                if infected_state:
                    b = cls(True, False, row, col)
                else:
                    b = cls(False, False, row, col)
                berries.append(b)
            garden.append(berries)

        return garden

    def __repr__(self):
        return "Berry({self.infected}, {self.infected_now}, {self.row}, {self.col})".format(self=self)


def neighbours(garden, row, col):
    result = [(row + 1, col),
              (row - 1, col),
              (row, col + 1),
              (row, col - 1)]

    for new_row, new_col in list(result):
        if not 0 <= new_row < len(garden) or not 0 <= new_col < len(garden[0]):
            result.remove((new_row, new_col))

    return result


def advance_day(garden):
    for row in range(len(garden)):
        for col in range(len(garden[0])):
            berry = garden[row][col]
            if berry.infected and not berry.infected_now:
                for neigh_row, neigh_col in neighbours(garden, row, col):
                    other_berry = garden[neigh_row][neigh_col]
                    if other_berry.infected:
                        continue
                    other_berry.infected = True
                    other_berry.infected_now = True

    for berries in garden:
        for berry in berries:
            berry.infected_now = False

    return garden


def parse_input(string):
    lines = iter(l.strip() for l in string.splitlines() if l.strip())
    rows, columns, days = list(map(int, next(lines).split()))
    garden = [[False] * columns] * rows
    garden = Berry.from_bitmap(garden)

    print("Garden dimensions: ", rows, columns)

    for line in lines:
        row, col = line.split()
        row = int(row) - 1
        col = int(col) - 1
        garden[row][col].infected = True
        print("Infected: ", row, col)

    return garden, days


def print_garden(garden):
    for berries in garden:
        print([b.infected for b in berries])


def healthy(garden):
    return sum(1 for berries in garden for berry in berries if not berry.infected)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('file', help="file with input")
    args = parser.parse_args()
    with open(args.file) as f:
        input_string = f.read()
    garden, days = parse_input(input_string)
    for day in range(days):
        garden = advance_day(garden)
    print("After {} days healthy are - {}".format(days, healthy(garden)))


if __name__ == '__main__':
    main()
