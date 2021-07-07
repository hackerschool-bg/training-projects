import http.client


def make_request(params):
    conn = http.client.HTTPConnection('localhost', 8080)
    conn.request(*params)
    response = conn.getresponse()
    print(response.status)
    print(response.read())
    conn.close()

def start():
    params_groups = [
        ('GET', '/index.html'),
        ('GET', '/'),
        ('POST', '/cgi-bin/test.py', 'Hello world', {'Content-Length': 11}),
        ('POST', '/cgi-bin/test.pya', 'Hello world', {'Content-Length': 11}),
    ]

    while True:
        for params in params_groups:
            make_request(params)

if __name__ == '__main__':
    start()
