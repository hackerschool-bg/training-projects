import collections
import collections.abc
import datetime
import io
import tempfile
import logging

import flask
import openpyxl
import openpyxl.worksheet
import psycopg2.extensions

from pachu.config import config
from pachu.err import UserError, assertUser

stdout_logger = logging.getLogger('stdout')
stderr_logger = logging.getLogger('stderr')
DEFAULT_TRANSFERRED_DELTA = datetime.timedelta(weeks=4)
ALLOWED_TRANSFERRED_DELTA = datetime.timedelta(weeks=52)


def workbook_from_records(*, column_names, records_iterable, filters,
                          query_name):
    assert isinstance(column_names, collections.Iterable)
    assert isinstance(records_iterable, collections.Iterable)
    assert isinstance(filters, collections.Mapping)
    assert isinstance(query_name, str)

    wb = openpyxl.Workbook()
    sheet = wb.active
    offset = (1, 1)
    offset = insert_table(sheet=sheet,
                          columns=['Name', 'Value'],
                          records=filters.items(),
                          table_name='Filters',
                          offset=offset)

    offset = (offset[0] + 1, *offset[1:])

    insert_table(sheet=sheet,
                 columns=column_names,
                 records=records_iterable,
                 table_name=query_name,
                 offset=offset)

    return wb


def insert_table(*, sheet, columns, records, table_name, offset):
    assert isinstance(sheet, openpyxl.worksheet.Worksheet)
    assert isinstance(columns, collections.Iterable)
    assert isinstance(records, collections.Iterable)
    assert isinstance(table_name, str)
    assert isinstance(offset, collections.Container)

    def write_row(sheet, values, offset):
        assert isinstance(sheet, openpyxl.worksheet.Worksheet)
        assert isinstance(values, collections.Iterable)
        assert isinstance(offset, collections.Container)

        row, col = offset

        for col_offset, v in enumerate(values):
            sheet.cell(row=row, column=col + col_offset,
                       value=str(v))

        return row + 1, col

    offset = write_row(sheet, [table_name], offset)
    offset = write_row(sheet, columns, offset)
    for row in records:
        offset = write_row(sheet, row, offset)

    return offset


def build_order_by_clause(sort):
    parts = []

    for part_schema in sort:
        column = part_schema['column']
        sort = part_schema['order']
        assert '"' not in column or '\\' not in column

        parts.append('{} {}'.format(column, sort))

    return ', '.join(parts)


def export_credit_history(
        cursor, *,
        column_names=None,
        filter_column_names=None,
        v,
        api_key,
        fly_from=None,
        fly_to=None,
        date_from=None,
        date_to=None,
        transferred_from=None,
        transferred_to=None,
        status=None,
        transfer_amount=None,
        transfer_amount_operator=None,
        group_by=None,
        sort=None
):
    sort = sort or [{'column': 'transferred_at', 'order': 'DESC'}]
    method_config = config['api_export_credit_history']
    column_names = (column_names or
                    config['api_export_credit_history_column_names'])
    column_names = dict(column_names)
    filter_column_names = (filter_column_names or
                           config['api_export_credit_history_filter_names'])
    filter_column_names = dict(filter_column_names)
    # TODO this is wrong
    filter_order = method_config['filter_names_order'].split(',')
    filter_column_names = collections.OrderedDict(
        sorted(filter_column_names.items(),
               key=lambda e: filter_order.index(e[0]))
    )

    if transferred_to:
        transferred_to = datetime.datetime.strptime(
            transferred_to,
            method_config['transferred_dates_format']
        )
    else:
        transferred_to = datetime.datetime.now()

    if transferred_from:
        transferred_from = datetime.datetime.strptime(
            transferred_from,
            method_config['transferred_dates_format']
        )
    else:
        transferred_from = transferred_to - DEFAULT_TRANSFERRED_DELTA

    exceeded_format_msg = 'Transferred date range exceeded {}'.format(
        ALLOWED_TRANSFERRED_DELTA
    )
    assertUser(transferred_to - transferred_from > ALLOWED_TRANSFERRED_DELTA,
               msg=exceeded_format_msg,
               code='API_ECH_EXCEEDED_TRANSFERRED_DELTA')

    cursor.execute('SET statement_timeout=%(time)s',
                   dict(time=method_config['timeout']))
    cursor.execute('SELECT id FROM users WHERE api_key=%s', [api_key])

    try:
        user_id = cursor.fetchone()[0]
    except TypeError:  # cursor.fetchone() returns None instead of []
        raise UserError(code='API_ECH_INVALID_CREDENTIALS',
                        msg='User entered invalid api key.',
                        user_msg='Invalid api key.')

    try:
        cursor.execute(
            """
            INSERT INTO api_usage (user_id, api_method)
            VALUES (%s, %s)
            """,
            [user_id, 'export_credit_history']
        )
    except psycopg2.IntegrityError as e:
        stderr_logger.info('User with id %s requested an export too often.')
        raise UserError(msg='Exports are allowed once every 1 minute.',
                        code='API_ECH_RATE_LIMITED',
                        user_msg='You are requesting an export too soon after '
                                 'the previous one.') from e

    query_params = dict(
        user_id=user_id,
        status=status,
        date_from=date_from,
        date_to=date_to,
        transferred_from=transferred_from,
        transferred_to=transferred_to,
        transfer_amount=transfer_amount,
        fly_from=fly_from,
        fly_to=fly_to,
    )
    filters = dict(
        status_filter=('AND users_subscriptions.active=%(status)s',
                       bool(status)),
        date_from_filter=('AND users_subscriptions.date_from >= %(date_from)s',
                          bool(date_from)),
        date_to_filter=('AND users_subscriptions.date_to <= %(date_to)s',
                        bool(date_to)),
        transferred_at_filter=(
            '''
            AND account_transfers.transferred_at BETWEEN 
                %(transferred_from)s AND %(transferred_to)s
            ''',
            bool(transferred_from)
        ),
        transfer_amount_filter=(
            '''
            AND account_transfers.transfer_amount {transfer_amount_operator} %(transfer_amount)s
            '''.format(transfer_amount_operator=transfer_amount_operator),
            transfer_amount and transfer_amount_operator
        ),
        airport_from_filter=(
            '''
            AND (ap_from.name=%(fly_from)s OR ap_from.iata_code=%(fly_from)s)
            ''',
            bool(fly_from)),
        airport_to_filter=(
            '''AND (ap_to.name=%(fly_to)s OR ap_to.iata_code=%(fly_to)s)''',
            bool(fly_to)
        )
    )
    for key, filter_ in filters.items():
        clause, activated = filter_
        filters[key] = clause if activated else ''

    select_config = collections.OrderedDict(
        (('transferred_at', 'transferred_at'),
         ('active', 'active'),
         ('reason', 'reason'),
         ('subscription_plan', 'subscription_plans.name'),
         ('transfer_amount', 'transfer_amount'),
         ('airport_from', 'ap_from.name'),
         ('airport_to', 'ap_to.name'),
         ('date_from', 'date_from'),
         ('date_to', 'date_to'),
         ('user_subscr_id', 'user_subscr_id'))
    )
    extra_select_config_when_grouping = dict(
        transfer_amount='SUM(transfer_amount) AS transfer_amount'
    )
    group_by_config = dict(
        transferred_at=dict(
            year="date_trunc('year', CAST(transferred_at AS date))",
            month="date_trunc('month', CAST(transferred_at AS date))",
            day="date_trunc('day', CAST(transferred_at AS date))",
            default="date_trunc('day', CAST(transferred_at AS date))"
        ),
        active=dict(default='active'),
        reason=dict(default='reason')
    )

    select_columns = tuple(select_config.keys())
    if group_by:
        select_statements = {}
        group_by_statements = []

        for column, type_ in group_by.items():
            statement = group_by_config[column][type_]
            group_by_statements.append(statement)
            select_st = '{} AS {}'.format(statement, column)
            select_statements[column] = select_st

        for column, select_st in select_config.items():
            if column in group_by:
                continue
            select_statements[column] = extra_select_config_when_grouping.get(
                column,
                "'ALL' AS {}".format(column)
            )

        select_statements = sorted(
            select_statements.items(),
            key=lambda pair: select_columns.index(pair[0])
        )
        select_statements = [pair[1] for pair in select_statements]
        group_by_clause = 'GROUP BY {}'.format(','.join(group_by_statements))
        select_clause = ','.join(select_statements)
    else:
        group_by_clause = ''
        select_clause = ','.join(select_config.values())

    order_by_clause = build_order_by_clause(sort)
    # noinspection SqlResolve
    query = '''
    SELECT {select_clause}
    FROM (
        SELECT 
            users_subscriptions.active,
            'initial tax' AS reason,
            subscription_plan_id,
            transfer_amount,
            transferred_at,
            subscriptions.airport_from_id,
            subscriptions.airport_to_id, 
            date_from,
            date_to,
            users_subscriptions.id AS user_subscr_id
        FROM account_transfers
        JOIN user_subscription_account_transfers AS usat
          ON account_transfers.id=usat.account_transfer_id
        JOIN users_subscriptions 
            ON usat.user_subscription_id=users_subscriptions.id
                {status_filter}
                {date_from_filter}
                {date_to_filter}
        JOIN subscriptions
            ON users_subscriptions.subscription_id=subscriptions.id
        WHERE account_transfers.user_id=%(user_id)s
            {transferred_at_filter}
            {transfer_amount_filter}
        UNION ALL
        SELECT 
            users_subscriptions.active,
            'fetch tax' AS reason,
            subscription_plan_id,
            transfer_amount,
            transferred_at,
            airport_from_id,
            airport_to_id, 
            date_from,
            date_to,
            users_subscriptions.id AS user_subscr_id
        FROM account_transfers
        JOIN subscriptions_fetches_account_transfers AS sfat 
            ON account_transfers.id=sfat.account_transfer_id
        JOIN subscriptions_fetches 
            ON sfat.subscription_fetch_id=subscriptions_fetches.id
        JOIN subscriptions 
            ON subscriptions_fetches.subscription_id=subscriptions.id
        JOIN users_subscriptions 
            ON subscriptions.id=users_subscriptions.subscription_id AND
                users_subscriptions.user_id=%(user_id)s
                {status_filter}
                {date_from_filter}
                {date_to_filter}
        WHERE account_transfers.user_id=%(user_id)s
            {transferred_at_filter}
            {transfer_amount_filter}
    ) AS taxes
    JOIN airports AS ap_from
      ON taxes.airport_from_id=ap_from.id
        {airport_from_filter}
    JOIN airports AS ap_to
      ON taxes.airport_to_id=ap_to.id
        {airport_to_filter}
    JOIN subscription_plans
        ON taxes.subscription_plan_id=subscription_plans.id
    {group_by_clause}
    ORDER BY {order_by_clause}
    '''.format(
        **filters,
        group_by_clause=group_by_clause,
        select_clause=select_clause,
        order_by_clause=order_by_clause
    )
    try:
        cursor.execute(query, query_params)
    except psycopg2.extensions.QueryCanceledError:
        stdout_logger.exception('Credit history query timed out.')
        raise UserError(msg='Query took too long',
                        code='API_ECH_QUERY_TIMEOUT',
                        user_msg='Export is too large. Use the filters, Luke.')
    stderr_logger.info('Fetched rows from db. Beginning export to .xlsx...')
    # TODO refactor this code into a generic class that works for every query
    column_names = {column: export_name
                    for column, export_name in column_names.items()
                    if column in select_columns}
    ordered_column_names = sorted(
        column_names.items(),
        key=lambda entry: select_columns.index(entry[0])
    )
    ordered_column_names = tuple(e[1] for e in ordered_column_names)

    human_readable_filters = collections.OrderedDict()
    for f, column_name in filter_column_names.items():
        if f in query_params:
            human_readable_filters[column_name] = query_params[f]

    wb = workbook_from_records(query_name='credit_history',
                               column_names=ordered_column_names,
                               records_iterable=cursor.fetchall(),
                               filters=human_readable_filters)

    stderr_logger.info('Saving export to temporary file.')
    tmp = tempfile.NamedTemporaryFile()
    wb.save(tmp.name)
    tmp.seek(0)
    stream = io.BytesIO(tmp.read())
    filename = '{user_id}-${date}'.format(user_id=user_id,
                                          date=datetime.datetime.now())
    return flask.send_file(
        stream,
        mimetype=method_config['xlsx_mime_type'],
        as_attachment=True,
        attachment_filename=filename
    )
