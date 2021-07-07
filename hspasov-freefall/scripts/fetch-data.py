from urllib import error
from urllib.parse import urlencode
import urllib.request
import json
import sqlite3
import sys
import re
from datetime import date, datetime
from dateutil.relativedelta import relativedelta

ROUTES_LIMIT = 30
SERVER_TIME_FORMAT = '%Y-%m-%dT%H:%M:%S'
KIWI_API_DATE_FORMAT = '%d/%m/%Y'

class BaseError(Exception):
    def __init__(self, msg):
        super().__init__(msg)
        self.msg = msg
        handle_error(self.msg)


class AppError(BaseError):
    def __init__(self, msg):
        super().__init__(msg)


class PeerError(BaseError):
    def __init__(self, msg):
        super().__init__(msg)


class UserError(BaseError):
    def __init__(self, msg):
        super().__init__(msg)


def assert_app(condition, msg):
    if not condition:
        raise AppError(msg)


def assert_peer(condition, msg):
    if not condition:
        raise PeerError(msg)


def assert_user(condition, msg):
    if not condition:
        raise UserError(msg)


def handle_error(error):
    log(error)
    sys.exit()


def log(msg):
    print(msg)


def request(URL, params=None):
    assert_app(
        isinstance(URL, str),
        'Expected url to be str, but was {0}, value "{1}"'.format(type(URL), URL))
    assert_app(
        params is None or isinstance(params, dict),
        'Expected params to be None or dict, but was {0}, value "{1}"'.format(type(params), params))

    uri = URL;

    if '?' not in URL and params is not None:
        uri += '?'

    if params is not None:
        uri += urlencode(params)

    log(uri)

    try:
        response = urllib.request.urlopen(uri).read()
        parsed = json.loads(response.decode('utf-8'))
    except (error.URLError, UnicodeError, json.JSONDecodeError) as e:
        raise PeerError(e)

    return parsed


def stringify_columns(columns):
    assert_app(isinstance(columns, list), 'Expected argument "columns" in stringify_columns function to be list, but was {0}'.format(type(columns)))
    assert_app(len(columns) > 0, 'Expected list "columns" to have a length > 0, but length was {0}'.format(len(columns)))
    assert_app(all(isinstance(col, str) for col in columns), 'All elements in arg "columns" in stringify_columns function are required to be str.')

    return ', '.join(columns)

def to_smallest_currency_unit(quantity):
    return quantity * 100


def select(conn, table, columns):
    assert_app(isinstance(table, str), 'Expected argument "table" in select function to be str, but was {0}'.format(type(table)))
    assert_app(isinstance(columns, list), 'Expected argument "columns" in select function to be list, but was {0}'.format(type(columns)))
    assert_app(isinstance(conn, sqlite3.Connection), 'select function called without connection to db.')

    c = conn.cursor()

    c.execute('SELECT {0} FROM {1};'.format(stringify_columns(columns), table))

    result = c.fetchall()
    c.close()

    return result


def select_where(conn, table, columns, where):
    assert_app(isinstance(table, str), 'Expected argument "table" in select_where function to be str, but was {0}'.format(type(table)))
    assert_app(isinstance(columns, list), 'Expected argument "columns" in select_where function to be list, but was {0}'.format(type(columns)))
    assert_app(isinstance(where, dict), 'Expected argument "where" in select_where function to be a dict, but was {0}'.format(type(where)))
    assert_app(len(where) == 1, 'Expected argument "where" in select_where function to be a dict of length=1, but length={0}'.format(len(where)))
    assert_app(isinstance(conn, sqlite3.Connection), 'select_where function called without connection to db.')

    c = conn.cursor()

    whereCol = list(where.keys())[0]

    c.execute('SELECT {0} FROM {1} WHERE {2} = ?;'.format(stringify_columns(columns), table, whereCol), [where[whereCol]])

    result = c.fetchall()

    assert_app(isinstance(result, list), 'Expected result in select_where function to be a list, but was {0}'.format(type(result)))

    return result


def select_subscriptions(conn, airport_from_id, airport_to_id):
    assert_app(isinstance(conn, sqlite3.Connection), 'select_subscriptions function called without connection to db.')
    assert_app(isinstance(airport_from_id, int), 'Expected argument "airport_from_id" in select_subscriptions function to be int, but was {0}'.format(type(airport_from_id)))
    assert_app(isinstance(airport_to_id, int), 'Expected argument "airport_to_id" in select_subscriptions function to be int, but was {0}'.format(type(airport_to_id)))

    c = conn.cursor()

    c.execute('''

        SELECT
            fetches.id AS fetch_id,
            fetches.timestamp
        FROM fetches
        LEFT JOIN subscriptions
        ON
            fetches.subscription_id = subscriptions.id
        WHERE
            subscriptions.airport_from_id = ? AND
            subscriptions.airport_to_id = ?
        GROUP BY
            subscriptions.airport_from_id,
            subscriptions.airport_to_id
        HAVING
            MAX(fetches.timestamp);

        ''', [airport_from_id, airport_to_id])

    result = c.fetchall()

    assert_app(isinstance(result, list), 'Expected result in select_subscriptions function to be a list, but was {0}'.format(type(result)))

    return result


def insert(conn, table, data):
    assert_app(isinstance(table, str), 'Expected argument "table" in insert function to be str, but was {0}'.format(type(table)))
    assert_app(isinstance(data, dict), 'Expected argument "data" in insert function to be dict, but was {0}'.format(type(data)))
    assert_app(isinstance(conn, sqlite3.Connection), 'insert function called without connection to db.')

    c = conn.cursor()

    columns = list(data.keys())
    values = tuple(data.values())

    rowStringified = ', '.join(['?'] * len(columns))

    c.execute('INSERT INTO {0} ({1}) VALUES ({2});'.format(table, stringify_columns(columns), rowStringified), values)

    assert_app(isinstance(c.lastrowid, int), 'Expected lastrowid in insert function to be int, but was {0}'.format(type(c.lastrowid)))

    id_inserted = c.lastrowid

    conn.commit()
    c.close()

    return id_inserted


def insert_data_fetch(conn, subscription_id):
    assert_app(isinstance(subscription_id, int), 'Expected argument "subscription_id" in insert_data_fetch function to be int, but was {0}'.format(type(subscription_id)))
    assert_app(isinstance(conn, sqlite3.Connection), 'insert_data_fetch function called without connection to db.')

    c = conn.cursor()

    c.execute('INSERT INTO fetches(timestamp, subscription_id) VALUES (strftime(\'%Y-%m-%dT%H:%M:%SZ\' ,\'now\'), ?);', [subscription_id])

    assert_app(isinstance(c.lastrowid, int), 'Expected lastrowid in insert_data_fetch function to be int, but was {0}'.format(type(c.lastrowid)))

    id_inserted = c.lastrowid

    conn.commit()

    c.close()

    return id_inserted


def insert_if_not_exists(conn, table, data, exists_check):
    assert_app(isinstance(conn, sqlite3.Connection), 'insert_if_not_exists function called without connection to db.')
    assert_app(isinstance(table, str), 'Expected argument "table" in insert_if_not_exists function to be str, but was {0}'.format(type(table)))
    assert_app(isinstance(data, dict), 'Expected argument "data" in insert_if_not_exists function to be dict, but was {0}'.format(type(data)))
    assert_app(isinstance(exists_check, dict), 'Expected argument "exists_check" in insert_if_not_exists function to be dict, but was {0}'.format(type(exists_check)))

    found = select_where(conn, table, list(data.keys()), exists_check)

    assert_app(isinstance(found, list), 'Expected result after exist check in insert_if_not_exists function to be list, but was {0}'.format(type(found)))

    if len(found) > 0:
        assert_app(len(found) == 1, 'Expected length of found in insert_if_not_exists function to be 1, but was {0}'.format(len(found)))

        return False

    insert_id = insert(conn, table, data)

    assert_app(isinstance(insert_id, int), 'Expected insert result to be an int, but was {0}'.format(type(insert_id)))

    return True


def insert_if_not_exists_sub(conn, airport_from_id , airport_to_id):
    assert_app(isinstance(conn, sqlite3.Connection), 'insert_if_not_exists_sub function called without connection to db.')
    assert_app(isinstance(airport_from_id , int), 'Expected argument "airport_from_id " in insert_if_not_exists_sub function to be int, but was {0}'.format(type(airport_from_id)))
    assert_app(isinstance(fly_to, int), 'Expected argument "airport_to_id" in insert_if_not_exists_sub function to be int, but was {0}'.format(type(airport_to_id)))

    c = conn.cursor()

    c.execute('SELECT id FROM subscriptions WHERE airport_from_id = ? AND airport_to_id = ?;', [airport_from_id , airport_to_id])

    found = c.fetchall()

    assert_app(isinstance(found, list), 'Expected result of exist check in insert_if_not_exists function to be a list, but was {0}'.format(type(result)))

    if len(found) > 0:
        assert_app(len(found) == 1, 'Expected length of found in insert_if_not_exists_check to be 1, but was {0}'.format(len(found)))

        return False

    insert(conn, 'subscriptions', {
        'airport_from_id': airport_from_id,
        'airport_to_id': airport_to_id
    })

    return True


def get_subscription_data(conn, airport_end_points, fetch_id):
    for label, end_point in airport_end_points.items():
        assert_app(
            isinstance(end_point, str),
            'Expected {0} to be str, but got value "{1}" of type "{2}"'.format(label, end_point, type(end_point)))

    offset = 0
    next_page_available = True

    while next_page_available:
        next_page_available = False

        flights_dict = {}
        airports_set = set()

        response = request('https://api.skypicker.com/flights', {
            'flyFrom': airport_end_points['airport_from'],
            'to': airport_end_points['airport_to'],
            'dateFrom': date.today().strftime(KIWI_API_DATE_FORMAT),
            'dateTo': (date.today() + relativedelta(months=+1)).strftime(KIWI_API_DATE_FORMAT),
            'typeFlight': 'oneway',
            'partner': 'picky',
            'v': '2',
            'xml': '0',
            'locale': 'en',
            'offset': offset,
            'limit': ROUTES_LIMIT,
        })

        assert_peer(
            isinstance(response, dict),
            'API sent invalid data response. Expected type dict but got {0}'.format(type(response)))
        expect_response_keys = ['data', 'currency', '_next']

        for key in expect_response_keys:
            assert_peer(key in response, 'Key {0} not found in response'.format(key))
        assert_peer(isinstance(response['currency'], str), 'Expected currency in response to be str, but was {0}'.format(type(response['currency'])))
        assert_peer(isinstance(response['data'], list), 'Expected data in response to be list, but was {0}'.format(type(response['data'])))

        for route in response['data']:
            assert_peer(isinstance(route, dict), 'Expected route in data to be dict, but was {0}'.format(type(route)))
            expect_route_keys = ['route', 'booking_token', 'price']

            for key in expect_route_keys:
                assert_peer(key in route, 'Key {0} not found in route'.format(key))

            assert_peer(isinstance(route['booking_token'], str), 'Expected booking_token in route to be str, but was {0}'.format(type(route['booking_token'])))
            assert_peer(isinstance(route['price'], int), 'Expected price in route to be int but was {0}'.format(type(route['price'])))
            assert_peer(isinstance(route['route'], list), 'Expected route in route to be list, but was {0}'.format(type(route['route'])))

            for flight in route['route']:
                assert_peer(isinstance(flight, dict), 'Expected flight in route item to be dict, but was {0}'.format(type(flight)))
                expect_flight_keys = ['flight_no', 'aTimeUTC', 'dTimeUTC', 'return', 'flyFrom', 'flyTo', 'airline', 'id']

                for key in expect_flight_keys:
                    assert_peer(key in flight, 'Key {0} not found in flight'.format(key))

                integer_keys = ['flight_no', 'aTimeUTC', 'dTimeUTC']

                for key in integer_keys:
                    assert_peer(isinstance(flight[key], int), 'Expected {0} in flight to be int, but was {1}'.format(key, type(flight[key])))

                string_keys = ['flyFrom', 'flyTo', 'airline', 'id']

                for key in string_keys:
                    assert_peer(isinstance(flight[key], str), 'Expected {0} in flight to be str, but was {1}'.format(key, type(flight[key])))

                assert_peer(flight['return'] in [0, 1], 'Expected return in flight to be 0 or 1, but was {0}'.format(flight['return']))
                assert_peer(flight['flyFrom'] != flight['flyTo'], 'Expected different values for flyFrom and flyTo, but got {0} and {1}'.format(flight['flyFrom'], flight['flyTo']))

                if flight['id'] not in flights_dict:
                    flights_dict[flight['id']] = flight
                airports_set.add(flight['flyFrom'])
                airports_set.add(flight['flyTo'])

        log('From {0} to {1} (offset: {2}): data for {3} airports. Getting data...'.format(
            airport_end_points['airport_from'],
            airport_end_points['airport_to'],
            offset,
            len(airports_set)))

        for airport_iata_code in airports_set:
            get_airport_if_not_exists(conn, airport_iata_code)

        log('Finished getting data for airports.')
        log('From {0} to {1} (offset: {2}): data for {3} flights. Getting data...'.format(
            airport_end_points['airport_from'],
            airport_end_points['airport_to'],
            offset,
            len(flights_dict)))

        for flight_id, flight in flights_dict.items():
            airport_codes = [
                flight['flyFrom'],
                flight['flyTo']
            ]

            airport_ids = []

            for iata_code in airport_codes:
                select_result = select_where(conn, 'airports', ['id'], {
                    'iata_code': iata_code
                })

                assert_app(isinstance(select_result, list), 'Expected airports select result to be a list, but was {0}'.format(type(select_result)))
                assert_app(len(select_result) == 1, 'Expected only one airports select result, but got {0}'.format(len(select_result)))
                assert_app(isinstance(select_result[0], sqlite3.Row), 'Expected element in airport select result to be sqlite3.Row, but was {0}'.format(select_result[0]))
                assert_app('id' in select_result[0].keys(), 'Key "id" not found in airport select result.')
                assert_app(isinstance(select_result[0]['id'], int), 'Expected id in airport select result element to be int, but was {0}'.format(select_result[0]['id']))

                airport_ids.append(select_result[0]['id'])

            airline_id_result = select_where(conn, 'airlines', ['id'], {
                'code': flight['airline']
            })

            assert_app(isinstance(airline_id_result, list), 'Expected airline select result to be a list, but was {0}'.format(type(airline_id_result)))
            assert_app(len(airline_id_result) == 1, 'Expected only one airline select result, but got {0}'.format(len(airline_id_result)))
            assert_app(isinstance(airline_id_result[0], sqlite3.Row), 'Expected element in airline select result to be sqlite3.Row, but was {0}'.format(airline_id_result[0]))
            assert_app('id' in airline_id_result[0].keys(), 'Key "id" not found in airline id result.')
            assert_app(isinstance(airline_id_result[0]['id'], int), 'Expected id in airline select result element to be int, but was {0}'.format(airline_id_result[0]['id']))

            log('Inserting if not exists flight {0} {1} from {2} to {3} departure time {4} ...'.format(
                flight['airline'],
                flight['flight_no'],
                flight['flyFrom'],
                flight['flyTo'],
                datetime.fromtimestamp(flight['dTimeUTC']).strftime(SERVER_TIME_FORMAT)))

            insert_if_not_exists(conn, 'flights', {
                'airline_id': airline_id_result[0]['id'],
                'airport_from_id': airport_ids[0],
                'airport_to_id': airport_ids[1],
                'dtime': datetime.fromtimestamp(flight['dTimeUTC']).strftime(SERVER_TIME_FORMAT),
                'atime': datetime.fromtimestamp(flight['aTimeUTC']).strftime(SERVER_TIME_FORMAT),
                'flight_number': flight['flight_no'],
                'remote_id': flight['id']
            }, {
                'remote_id': flight['id']
            })

        log('Finished getting data for flights')
        log('From {0} to {1} (offset: {2}): data for {3} routes. Getting data...'.format(
            airport_end_points['airport_from'],
            airport_end_points['airport_to'],
            offset,
            len(response['data'])))

        for route in response['data']:
            route_id = insert(conn, 'routes', {
                'booking_token': route['booking_token'],
                'price': to_smallest_currency_unit(route['price']),
                'fetch_id': fetch_id
            })

            for flight in route['route']:
                log('Inserting route {0} flight {1} {2} from {3} to {4} departure time {5} ...'.format(
                    route_id,
                    flight['airline'],
                    flight['flight_no'],
                    flight['flyFrom'],
                    flight['flyTo'],
                    datetime.fromtimestamp(flight['dTimeUTC']).strftime(SERVER_TIME_FORMAT)))

                flight_id_results = select_where(conn, 'flights', ['id'], {
                    'remote_id': flight['id']
                })

                assert_app(isinstance(flight_id_results, list), 'Expected flight_id_results to be a list, but was {0}'.format(type(flight_id_results)))
                assert_app(len(flight_id_results) == 1, 'Expected only one flight_id_result, but got {0}'.format(len(flight_id_results)))
                assert_app(isinstance(flight_id_results[0], sqlite3.Row), 'Expected element in flight_id_results to be sqlite3.Row, but was {0}'.format(type(flight_id_results[0])))
                assert_app('id' in flight_id_results[0].keys(), 'Key "id" not found in flight_id_results element')
                assert_app(isinstance(flight_id_results[0]['id'], int), 'Flight id is not an int, but a {0}'.format(flight_id_results[0]['id']))

                insert(conn, 'routes_flights', {
                    'flight_id': flight_id_results[0]['id'],
                    'route_id': route_id,
                    'is_return': flight['return']
                })

        if isinstance(response['_next'], str):
            next_page_available = True
            offset += ROUTES_LIMIT





def get_airport_if_not_exists(conn, iata_code):
    airports = select_where(conn, 'airports', ['id'], {
        'iata_code': iata_code
    })

    assert_app(isinstance(airports, list), 'Expected array of airports from database but got {0}'.format(type(airports)))

    if len(airports) > 0:
        assert_app(len(airports) == 1, 'Expected one airport, but got {0}'.format(len(airports)))
        assert_app(isinstance(airports[0], sqlite3.Row), 'Expected airport data to be sqlite3.Row, but got {0}'.format(type(airports[0])))
        assert_app('id' in airports[0].keys(), 'Key "id" not found in dict airports[0]')
        assert_app(
            isinstance(airports[0]['id'], int),
            'Expected id of airport data to be int, but got {0}'.format(type(airports[0]['id'])))

        return airports[0]['id']

    response = request('https://api.skypicker.com/locations', {
        'term': iata_code,
        'locale': 'en-US',
        'location_types': 'airport',
        'limit': 1
    })

    assert_peer(isinstance(response, dict), 'Expected airports response to be dict, but was {0}'.format(type(response)))
    assert_peer('locations' in response, 'Key "locations" not found in dict airports response')
    assert_peer(isinstance(response['locations'], list), 'Expected airports["locations"] to be list, but was {0}'.format(type(response['locations'])))
    assert_peer(len(response['locations']) == 1, 'Expected only one location found for airport search but got {0}'.format(len(response['locations'])))
    assert_peer(isinstance(response['locations'][0], dict), 'Expected location to be a dict, but was {0}'.format(type(response['locations'][0])))

    location = response['locations'][0]

    expect_location_keys = ['code', 'name']

    for key in expect_location_keys:
        assert_peer(key in location, 'Key {0} not found in location')
        assert_peer(isinstance(location[key], str), 'Expected location["{0}"] to be str, but was {1}'.format(key, type(location[key])))

    airport_id = insert(conn, 'airports', {
        'iata_code': location['code'],
        'name': '{0}, {1}'.format(location['name'], location['code'])
    })

    return airport_id


def start():
    conn = sqlite3.connect('../freefall.db')

    conn.row_factory = sqlite3.Row

    airlines = request('https://api.skypicker.com/airlines')

    assert_peer(
        isinstance(airlines, list),
        'Expected airlines to be a list, but was "{0}"'.format(type(airlines)))

    for airline in airlines:
        assert_peer(
            isinstance(airline, dict),
            'Expected airline to be a dict, but was "{0}"'.format(type(airline)))

        expect_airline_keys = ['id', 'name']

        for key in expect_airline_keys:
            assert_peer(key in airline, 'Key "{0}" not found in airline'.format(key))
            assert_peer(
                isinstance(airline[key], str),
                'Expected airline[{0}] "{1}" to be str, but was "{2}"'.format(key, airline[key], type(airline[key])))

        # check for FakeAirline:
        if airline['id'] == '__':
            continue

        iata_code_pattern = re.compile('^[A-Z0-9]+$')

        assert_peer(iata_code_pattern.match(airline['id']), 'Invalid iata code "{0}"'.format(airline['id']))

        log('Inserting if not exists airline {0} ({1})...'.format(airline['name'], airline['id']))

        insert_if_not_exists(conn, 'airlines', {
            'name': '{0} {1}'.format(airline['name'], airline['id']),
            'code': airline['id'],
            'logo_url': 'https://images.kiwi.com/airlines/64/{0}.png'.format(airline['id'])
        }, {
            'code': airline['id']
        })

    subscriptions = select(conn, 'subscriptions', ['id', 'airport_from_id', 'airport_to_id'])

    assert_app(
        isinstance(subscriptions, list),
        'Expected subscriptions to be a list, but was "{0}"'.format(type(subscriptions)))


    for sub in subscriptions:
        assert_app(
            isinstance(sub, sqlite3.Row),
            'Expected subscription to be sqlite3.Row, but was "{0}"'.format(type(sub)))

        expect_subscription_keys = ['id', 'airport_from_id', 'airport_to_id']

        for key in expect_subscription_keys:
            assert_app(key in sub.keys(), 'Key "{0}" not found in subscription'.format(key))
            assert_app(
                isinstance(sub[key], int),
                'Expected sub[{0}] "{1}" to be int, but was "{2}"'.format(key, sub[key], type(sub[key])))

        fetch_id = insert_data_fetch(conn, sub['id'])

        airport_from = select_where(conn, 'airports', ['id', 'iata_code', 'name'], {
            'id': sub['airport_from_id']
        })
        airport_to = select_where(conn, 'airports', ['id', 'iata_code', 'name'], {
            'id': sub['airport_to_id']
        })

        # TODO assert airport_from and airport_to

        get_subscription_data(conn, {'airport_from': airport_from[0]['iata_code'], 'airport_to': airport_to[0]['iata_code']}, fetch_id)

        log('Done.')

start()
