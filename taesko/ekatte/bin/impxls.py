import collections
import os
import xlrd
import psycopg2


Municipality = collections.namedtuple('Municipation', ['str_id', 'name'])
Province = collections.namedtuple('Province', ['str_id', 'municipality_id', 'name'])
Ekatte = collections.namedtuple('Ekatte', ['str_id', 'province_id', 'name', 'kind', 'altitude'])


def xls_files():
    dpath = 'xls_data'
    paths = {'ekatte': 'Ek_atte.xls',
             'provinces': 'Ek_obst.xls',
             'municipalities': 'Ek_obl.xls'}
    for key, path in paths.items():
        yield key, os.path.join(dpath, path)


def municipality_from(row):
    return Municipality(str_id=row[0], name=row[2])


def province_from(row):
    return Province(str_id=row[0], municipality_id=row[0][:3], name=row[2])


def ekatte_from(row):
    return Ekatte(str_id=row[0], province_id=row[4], name=row[2], kind=row[6], altitude=row[8])


def generic_xls_parser(row_start, row_func):
    def wrapped(file):
        print("Parsing file", file)
        book = xlrd.open_workbook(file)
        print("The number of worksheets is {0}".format(book.nsheets))
        print("Worksheet name(s): {0}".format(book.sheet_names()))
        sheet = book.sheet_by_index(0)
        print("Parsing only first sheet -", sheet)
        for rx in range(row_start, sheet.nrows):
            values = [row.value for row in sheet.row(rx)]
            yield row_func(values)
    return wrapped


parse_provinces = generic_xls_parser(1, province_from)

parse_municipalities = generic_xls_parser(1, municipality_from)

parse_ekatte = generic_xls_parser(2, ekatte_from)


def parse_data():
    files = dict(xls_files())
    parsers = {
        'municipalities': (files['municipalities'], parse_municipalities),
        'provinces': (files['provinces'], parse_provinces),
        'ekatte': (files['ekatte'], parse_ekatte)
    }
    for key, value in parsers.items():
        file, parser = value
        yield (key, tuple(parser(file)))


def existing_ids(cursor, table_name, ids, id_placeholder="%s"):
    id_select = "SELECT id FROM {table} WHERE id IN ".format(table=table_name)
    values = b','.join(cursor.mogrify(id_placeholder, [i]) for i in ids)
    query = bytes(id_select, encoding='utf-8') + b'(' + values + b')'
    cursor.execute(query)
    return cursor.fetchall()


def insert_values(cursor, insert_query, placeholders, data):
    args_str = b','.join(cursor.mogrify(placeholders, x) for x in data)
    query = bytes(insert_query, encoding='utf-8') + args_str
    cursor.execute(query)


def update_values(cursor, table, placeholders, data):
    pass


def import_data(cursor, table, placeholders, data):
    existing = existing_ids(cursor, table, [x.str_id for x in data])
    if existing:
        update_values()
    else:
        insert_values(cursor, "INSERT INTO {table} VALUES ".format(table=table), placeholders, data)


def import_all():
    conn = psycopg2.connect("dbname='ekatte' user='antonio' password='990302aA'")
    cursor = conn.cursor()
    data = dict(parse_data())
    import_data(cursor, 'municipalities', "(%s, %s)", data['municipalities'])
    conn.commit()
    import_data(cursor, 'provinces', "(%s, %s, %s)", data['provinces'])
    conn.commit()
    import_data(cursor, 'ekatte', "(%s, %s, %s, %s, %s)", data['ekatte'])
    conn.commit()
    cursor.close()
    conn.close()


import_all()
