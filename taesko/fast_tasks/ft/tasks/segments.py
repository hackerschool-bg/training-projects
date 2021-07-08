import argparse


def point_coords(line_length, a_step, b_step, b_offset):
    return range(0, line_length+1, a_step), range(b_offset, line_length+1, b_step)


def segs_by_length(a_coords, b_coords, length):
    for a in a_coords:
        for b in b_coords:
            if abs(a - b) == length:
                yield (a, b)


def segs_by_full_length(line_length, a_step, b_step, c_length):
    reset_length = a_step * b_step
    leftover = line_length % reset_length
    leftover_offset = reset_length * (line_length // reset_length)
    repeating_segs = segs_by_length(*point_coords(reset_length, a_step, b_step, line_length % b_step),
                                    c_length)
    repeating_segs = sorted(tuple(sorted(seg)) for seg in repeating_segs)
    leftover_segs = [(leftover_offset + seg[0], leftover_offset + seg[1]) for seg in repeating_segs if seg[1] <= leftover]
    return repeating_segs, leftover_segs


def concat_segments(seg_1, seg_2):
    if seg_1[0]<=seg_2[0]<=seg_1[1]:
        return seg_1[0], seg_2[1]
    else:
        raise ValueError("Segments can't be concatenated")


def concat_red_segments(segments):
    segments = sorted(tuple(sorted(seg)) for seg in segments)
    red_segments = []
    for seg in segments:
        for red_seg in tuple(red_segments):
            try:
                concated = concat_segments(red_seg, seg)
                red_segments.remove(red_seg)
                red_segments.append(concated)
                break
            except ValueError:
                pass
        else:
            red_segments.append(seg)
    return red_segments


def all_red_segments(line_length, a_step, b_step, segment_length):
    repeating, leftover = segs_by_full_length(line_length, a_step, b_step, segment_length)
    repetitions = line_length // (a_step * b_step)
    return repeating * repetitions + leftover


def total_red_length(red_segments):
    return sum(abs(seg[0] - seg[1]) for seg in red_segments)


def solve(line_length, a_step, b_step, segment_length):
    repeating, leftover = segs_by_full_length(line_length, a_step, b_step, segment_length)
    repeating_red = total_red_length(concat_red_segments(repeating))
    repetitions = line_length // (a_step * b_step)
    leftover_red = total_red_length(concat_red_segments(leftover))

    return line_length - (repeating_red * repetitions) - leftover_red


def red_segments_of_solution(repeating, leftover, line_length, reset_length):
    segments = set(leftover)

    reset_count = line_length // reset_length
    for reset_index in range(reset_count):
        offset = reset_index * reset_length
        for seg in repeating:
            start = offset + seg[0]
            end = offset + seg[1]
            if end <= line_length:
                segments.add((start, end))

    return sorted(segments)


def run(line_length, a_step, b_step, segment_length):
    repeating, leftover = segs_by_full_length(line_length, a_step, b_step, segment_length)
    repeating = [seg for seg in repeating if seg[1] <= line_length]
    leftover = [seg for seg in leftover if seg[1] <= line_length]
    repeating_red_segments = concat_red_segments(repeating)
    leftover_red_segments = concat_red_segments(leftover)
    reset_length = a_step * b_step
    red_segments = red_segments_of_solution(repeating_red_segments, leftover_red_segments,
                                            line_length, reset_length=reset_length)

    leftover_red_count = total_red_length(leftover_red_segments)
    repeating_red_count = total_red_length(repeating_red_segments)
    repetitions = line_length // (a_step * b_step)
    result = line_length - (repeating_red_count * repetitions) - leftover_red_count

    print('ALL', repeating, leftover)
    print('RED', repeating_red_segments, leftover_red_segments)

    return dict(
        answer=result,
        red_segments=red_segments
    )


def parse_input_string(string):
    return [int(num) for num in string.split(' ') if num]


def solution_2(string):
    return solve(*parse_input_string(string))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('line_length', type=int)
    parser.add_argument('a_step', type=int)
    parser.add_argument('b_step', type=int)
    parser.add_argument('segment_length', type=int)
    args = parser.parse_args()
    print(solve(args.line_length, args.a_step, args.b_step, args.segment_length))


if __name__ == '__main__':
    main()
