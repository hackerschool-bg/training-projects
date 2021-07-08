#!/usr/bin/python3
import sys
import itertools


def parse_line(line):
    columns = line.split('\t')
    ascii_name = columns[2].strip().replace(' ', '_')
    latitude = columns[4].strip()
    longtitude = columns[5].strip()
    return ascii_name, latitude, longtitude


def main():
    if len(sys.argv) > 2:
        print("Only one argument is supported - file path to location database.")
    file = sys.argv[1]
    max_count = None
    with open(file, mode='r', encoding='utf-8') as f:
        iterable = itertools.takewhile(lambda x: x[0] < max_count, enumerate(f)) if max_count else enumerate(f)
        for count, line in iterable:
            print(','.join(parse_line(line)))

if __name__ == '__main__':
    main()
