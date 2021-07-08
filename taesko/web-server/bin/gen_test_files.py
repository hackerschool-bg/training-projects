#!/usr/bin/env python3
import argparse
import io


UNITS = {
    'B': 1,
    'KB': 1024,
    'MB': 1024 * 1024,
    'GB': 1024 * 1024 * 1024
}
WRITE_CHUNK_SIZE = 4096


def generate_file(size):
    for _ in range(size):
        yield 'a'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('size', help='File size (default in KB)', type=int,
                        default=1)
    parser.add_argument('-p', '--path',
                        help='File path where to save the file.')
    parser.add_argument('-u', '--unit', help='Unit of size argument',
                        default='KB', choices=UNITS.keys())
    args = parser.parse_args()

    size = args.size * UNITS[args.unit]
    line = 'Test file of size around {} {}'.format(args.size, args.unit)

    if args.path:
        file_gen = generate_file(size)
        with open(args.path, mode='w') as f:
            f.write(line)
            for c in file_gen:
                f.write(c)
    else:
        buf = io.StringIO()
        for c in generate_file(size):
            buf.write(c)

        chunk = buf.read(WRITE_CHUNK_SIZE)
        while chunk:
            print(chunk)
            chunk = buf.read(WRITE_CHUNK_SIZE)


if __name__ == '__main__':
    main()
