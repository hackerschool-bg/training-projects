import requests
import itertools
import configparser
import os


config = configparser.ConfigParser()
config.read(os.environ['PARACHUTE_CONFIG_FILE'])


HOST = config['tests']['host']
PORT = config['tests']['port']
ADDRESS = 'http://{}:{}'.format(HOST, PORT)
API_ROUTE = config['routes']['api']
USER_API_KEY = config['tests']['small_user_api_key']


id_generator = itertools.count()


def test_export():
    params = dict(
        id=next(id_generator),
        jsonrpc='2.0',
        method='export_credit_history',
        params=dict(
            v='2.0',
            api_key=USER_API_KEY
        )
    )
    response = requests.post(ADDRESS + API_ROUTE + '?format=jsonrpc',
                             json=params)

    print('Headers are', response.headers)
    file = 'export.xlsx'
    with open(file, mode='wb') as f:
        for chunk in response.iter_content():
            f.write(chunk)

if __name__ == '__main__':
    test_export()
