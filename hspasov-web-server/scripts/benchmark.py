#!/usr/bin/env python3
import argparse
import collections
import enum
import re
import subprocess

TEST_REPETITION = 3  # repeat each test 3 times and get average
COLUMN_ORDER = (
    'Server Software',
    'Server Hostname',
    'Server Port',
    'Document Path',
    'Document Length',
    'Concurrency Level',
    'Time taken for tests',
    'Complete requests',
    'Failed requests',
    'Non-2xx responses',
    'Total transferred',
    'HTML transferred',
    'Requests per second',
    'Time per request',
    'Time per request',
    'Transfer rate'
)

TestResult = collections.namedtuple('TestResult', ['commit',
                                                   'cpu_time',
                                                   'mem_usage',
                                                   'worker_time',
                                                   'ab_fields',
                                                   'ab_raw'])
ABResult = collections.namedtuple('ABResult', ['commit', 'fields', 'raw'])
ABField = collections.namedtuple('ABField', ['field_text', 'value_text',
                                             'name', 'value', 'value_suffix'])


class ABOutTypes(enum.Enum):
    default = 'default'


def parse_default_number(text, value):
    match = re.match(r'([\d.]+)(.*)', value)

    if not match:
        raise ValueError('Value does not contain a number.')

    return ABField(field_text=text, value_text=value,
                   name=text, value=float(match.group(1)),
                   value_suffix=match.group(2))


def parse_default(text, value):
    return ABField(field_text=text, value_text=value,
                   name=text, value=value, value_suffix='')


def parse_ab_out(out, type_=ABOutTypes.default):
    field_regex = re.compile(r'\s*(.+?)\s*:\s*(.*)\s*')

    result = []

    for i, line in enumerate(out.splitlines()):
        line = line.strip()
        if i < 7 or not line:
            continue

        match = field_regex.match(line)

        if not match:
            continue

        field_text, value_text = match.group(1), match.group(2)

        if field_text not in COLUMN_ORDER:
            continue

        try:
            ab_field = parse_default_number(field_text, value_text)
        except ValueError:
            ab_field = parse_default(field_text, value_text)

        result.append(ab_field)

    return result


def prettify_test_result(test_result):
    assert isinstance(test_result, TestResult)

    result = ''

    result += 'CPU time: {0}\n'.format(test_result.cpu_time)
    result += 'Memory usage: {0}\n'.format(test_result.mem_usage)
    result += 'Worker time: {0}\n'.format(test_result.worker_time)

    for ab_field in test_result.ab_fields:
        if ab_field.value_suffix == ' [ms] (mean)':
            result += 'Time per request [ms] (mean): {0}\n'.format(ab_field.value)  # noqa
        elif ab_field.value_suffix == ' [ms] (mean, across all concurrent requests)':  # noqa
            result += 'Time per request [ms] (mean, across all concurrent requests): {0}\n'.format(ab_field.value)  # noqa
        else:
            result += '{0}: {1}\n'.format(ab_field.name, ab_field.value)

    return result


def calc_tests_avr(test_results):
    # TODO add asserts

    result_ab_fields = []
    sum_time_taken = 0
    sum_reqs_per_sec = 0
    sum_time_per_req_mean = 0
    sum_time_per_req_mean_total = 0
    sum_transfer_rate = 0

    for test_result in test_results:
        time_taken_field = next(filter(
            lambda ab_field: ab_field.name == 'Time taken for tests',
            test_result.ab_fields
        ))
        reqs_per_sec_field = next(filter(
            lambda ab_field: ab_field.name == 'Requests per second',
            test_result.ab_fields
        ))
        time_per_req_mean_field = next(filter(
            lambda ab_field: ab_field.value_suffix == ' [ms] (mean)',
            test_result.ab_fields
        ))
        time_per_req_mean_total_field = next(filter(
            lambda ab_field: ab_field.value_suffix == ' [ms] (mean, across all concurrent requests)',  # noqa
            test_result.ab_fields
        ))
        transfer_rate_field = next(filter(
            lambda ab_field: ab_field.name == 'Transfer rate',
            test_result.ab_fields
        ))

        sum_time_taken += time_taken_field.value
        sum_reqs_per_sec += reqs_per_sec_field.value
        sum_time_per_req_mean += time_per_req_mean_field.value
        sum_time_per_req_mean_total += time_per_req_mean_total_field.value
        sum_transfer_rate += transfer_rate_field.value

    sample_result = test_results[0]

    for field in sample_result.ab_fields:
        if field.name == 'Time taken for tests':
            result_ab_fields.append(field._replace(
                value_text='?',
                value=sum_time_taken / len(test_results)
            ))
        elif field.name == 'Requests per second':
            result_ab_fields.append(field._replace(
                value_text='?',
                value=sum_reqs_per_sec / len(test_results)
            ))
        elif field.value_suffix == ' [ms] (mean)':
            result_ab_fields.append(field._replace(
                value_text='?',
                value=sum_time_per_req_mean / len(test_results)
            ))
        elif field.value_suffix == ' [ms] (mean, across all concurrent requests)':  # noqa
            result_ab_fields.append(field._replace(
                value_text='?',
                value=sum_time_per_req_mean_total / len(test_results)
            ))
        elif field.name == 'Transfer rate':
            result_ab_fields.append(field._replace(
                value_text='?',
                value=sum_transfer_rate / len(test_results)
            ))
        else:
            result_ab_fields.append(field)

    return TestResult(
        commit='?',
        cpu_time='?',
        mem_usage='?',
        worker_time='?',
        ab_fields=result_ab_fields,
        ab_raw='?'
    )


def run_test(ab_args):
    ab_args = tuple(str(a) for a in ab_args)

    print('Running AB with arguments: `{}`'
          .format(' '.join(ab_args)))
    out = subprocess.check_output(ab_args).decode('utf-8')
    fields = parse_ab_out(out)

    git_out = subprocess.check_output(['git', 'log', '--oneline'],
                                      universal_newlines=True)
    commit = git_out.splitlines()[0]

    return TestResult(commit=commit, ab_fields=fields, ab_raw='?',
                      cpu_time='?', mem_usage='?',
                      worker_time='?')


def run_tests(*, urls, request_numbers, concurrences, headers=[], body):
    for url in urls:
        concurrencies_results = []

        for n, c in zip(request_numbers, concurrences):
            concurrency_results = []

            for i in range(TEST_REPETITION):
                if body is not None:
                    body_arg = ['-p', body]
                else:
                    body_arg = []

                headers_args = []

                for header in headers:
                    headers_args.extend(['-H', *header])

                ab_args = ['ab', '-n', n, '-c', c,
                           *headers_args, *body_arg, url]
                concurrency_results.append(run_test(ab_args))

            concurrency_result_avr = calc_tests_avr(concurrency_results)
            concurrencies_results.append(concurrency_result_avr)

            print(prettify_test_result(concurrency_result_avr))
            print('---')

        sum_time_per_req_mean_total = 0

        for result in concurrencies_results:
            time_per_req_mean_total_field = next(filter(
                lambda ab_field: ab_field.value_suffix == ' [ms] (mean, across all concurrent requests)',  # noqa
                result.ab_fields
            ))

            sum_time_per_req_mean_total += time_per_req_mean_total_field.value

        print('Avr time per request (mean, across all concurrent requests):')
        print(sum_time_per_req_mean_total / len(concurrencies_results))
        print('======')


def namedtuple_to_dict(nt):
    # noinspection PyProtectedMember
    dct = nt._asdict()

    for key, value in dct.items():
        if hasattr(value, '_asdict'):
            dct[key] = namedtuple_to_dict(value)

    return dct


def percent_encode(char):
    return '%' + hex(ord(char))[2:]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        '-c',
        help='Space separated list of concurrences to benchmark',
        nargs='+',
        type=int,
        required=True
    )
    parser.add_argument('-u', help='Space separated list of URLs to benchmark',
                        nargs='+', required=True)
    parser.add_argument('-n', help='Number of total requests', default=20)
    parser.add_argument('-H', help='Add header, eg. \'Accept-Encoding: gzip\' (repeatable)',
                        action='append', nargs='*', default=[])
    parser.add_argument('-p', help='File containing body to POST', default=None)
    args = parser.parse_args()

    request_numbers = [args.n] * len(args.c)
    run_tests(
        urls=args.u,
        request_numbers=request_numbers,
        concurrences=args.c,
        headers=args.H,
        body=args.p
    )


if __name__ == '__main__':
    main()
