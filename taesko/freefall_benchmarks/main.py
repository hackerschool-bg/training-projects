import collections
import re

import openpyxl


BenchmarkResult = collections.namedtuple(
    'BenchmarkResult',
    ['concurrency', 'requests_per_second', 'time_per_request',
     'client_time', 'executeQuery_time', 'eventloop_time']
)
BottleneckResult = collections.namedtuple(
    'BottleneckResult',
    ['name', 'average_time', 'max_time']
)

def parse_ab_fields(lines):
    lines = iter(lines)

    while not next(lines).startswith('Benchmarking'):
        pass

    result = {}

    for line in lines:
        if not line:
            continue
        if line.startswith('Connection times'):
            break
        field, value = line.split(':')
        result[field.strip().lower()] = value.strip()

    return result


def parse_profiling_fields(lines):
    lines = iter(lines)

    while not next(lines).startswith('Profiling statistics'):
        pass

    regex = re.compile(r"Profiled function is \\'([^']+)\\'' 'Max: ([\d\.]+).*?Average: ([\d\.]+)")

    results = []

    for line in lines:
        if not line:
            continue
        matched = regex.match(line)

        if not matched:
            continue

        results.append(BottleneckResult(name=matched.group(1),
                                        max_time=matched.group(2),
                                        average_time=matched.group(3)))

    return results





def parse_benchmark(file):
    with open(file) as f:
        lines = f.readlines()

    ab_fields = parse_ab_fields(lines)
    profiling = parse_profiling_fields(lines)

    first = {}
    for br in profiling:
        if br.name not in first:
            first[br.name] = br

    return BenchmarkResult(
        concurrency=ab_fields['concurrency'],
        requests_per_second=ab_fields['requests per second'],
        time_per_request=ab_fields['time per request'],
        client_time=first['client'],
        executeQuery_time=first['_executeQuery'],
        eventloop_time=first['eventloop-latency']
    )
