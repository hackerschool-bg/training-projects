import enum
import string

from ws.config import config
from ws.http.structs import HTTPStatusLine, HTTPHeaders, HTTPResponse
from ws.err import *


RESERVED_URI_CHARS = {'!', '*', '', "'",
                      '(', ')', ';', ':', '@', '&', '=', '+', '$', ',',
                      '?', '#',
                      '[', ']'}


class HTTPStatusCode(enum.Enum):
    ok = 200

    bad_request = 400
    forbidden = 403
    not_found = 404
    method_not_allowed = 405
    request_timeout = 408
    length_required = 411
    payload_too_large = 413
    uri_too_long = 414

    internal_server_error = 500
    service_unavailable = 503


def build_response(status_code, *, body=b'', reason_phrase='', headers=None,
                   version='HTTP/1.1'):
    assert isinstance(status_code, int)

    status_line = HTTPStatusLine(
        http_version=version,
        status_code=status_code,
        reason_phrase=reason_phrase
    )
    headers = HTTPHeaders(headers or {})

    if body:
        assert 'Content-Length' in headers
    else:
        headers['Content-Length'] = 0

    if status_code == 503:
        headers['Retry-After'] = config.getint('http',
                                               'retry_after') * 2

    return HTTPResponse(
        status_line=status_line,
        headers=headers,
        body=body
    )


def request_is_persistent(request):
    if request.request_line.http_version == 'HTTP/1.0':
        return ('Connection' in request.headers and
                b'Keep-Alive' in request.headers['Connection'])
    elif request.request_line.http_version == 'HTTP/1.1':
        return ('Connection' not in request.headers or
                b'close' not in request.headers['Connection'])


def response_is_persistent(response):
    if response.status_line.http_version == 'HTTP/1.0':
        conn = response.headers.get('Connection', b'')
        return 'Keep-Alive' in conn
    elif response.status_line.http_version == 'HTTP/1.1':
        return ('Connection' not in response.headers or
                'close' not in response.headers['Connection'])
    else:
        assert False


def encode_uri_component(component):
    encoded = []

    for c in component:
        if c in RESERVED_URI_CHARS:
            ce = hex(ord(c)).replace('0x', '%')
        else:
            ce = c

        encoded.append(ce)

    return ''.join(encoded)


def decode_uri_component(component):
    decoded = []
    index = -1

    while index + 1 < len(component):
        index += 1
        c = component[index]

        if c != '%':
            decoded.append(c)
            continue

        hex_ = component[index + 1: index + 3]
        if hex_[-1] not in string.hexdigits:
            hex_ = hex_[:-1]

        if not hex_ or not all(h in string.hexdigits for h in hex_):
            msg = 'Invalid percent encoded character at position {}'
            raise PeerError(msg=msg.format(index),
                            code='BAD_PERCENT_ENCODING')

        decoded.append(chr(int(hex_, base=16)))
        index += len(hex_)

    return ''.join(decoded)


def normalized_route(route):
    if not route.endswith('/'):
        return route + '/'
    else:
        return route
