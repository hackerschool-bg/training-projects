import base64
import binascii
import collections
import crypt
import hmac
import os
import pathlib

import ws.http.utils as hutils
from ws.config import config
from ws.err import *
from ws.logs import error_log


class AuthException(ServerException):
    pass


class InvalidCredentials(AuthException):
    pass


class BasicCredentials(collections.namedtuple('_BasicCredentials',
                                              ['login', 'pw_hash', 'routes'])):
    """ Stores credentials in a {login}, {pw_hash}, {routes} line format.

    Password is encoding using crypt(). It is not portable across different
    systems (possibly even different Linux systems).
    Routes are stored percent encoded and separated by a ':' character.

    The attributes login, pw_hash and routes are all ascii strings.
    The attribute routes is always in a decoded state.
    """
    @classmethod
    def from_line(cls, line):
        assert isinstance(line, str)

        login, pw_hash, rest = line.split(',', 3)
        routes = map(hutils.decode_uri_component, rest.split(':'))
        routes = tuple(hutils.normalized_route(r) for r in routes if r)

        return cls(login=login, pw_hash=pw_hash, routes=routes)

    @staticmethod
    def serialize_plain_text(login, plain_pw, routes):
        routes_part = ':'.join(map(hutils.encode_uri_component, routes))
        pw_hash = crypt.crypt(plain_pw)
        return ','.join([login, pw_hash, routes_part])

    def match_credentials(self, login, password):
        assert isinstance(login, str)
        assert isinstance(password, str)

        return hmac.compare_digest(self.pw_hash,
                                   crypt.crypt(password, self.pw_hash))


class BasicAuth:
    """ Implements Basic HTTP authentication.

    The check(request, address) method is used to authenticate a client sending
    a request.

    Credentials are automatically loaded on initialization. Use the
    load_credentials() method to reload from disk.
    """

    def __init__(self,
                 credentials_storage=config['settings']['authorization_file'],
                 auth_timeout=config.getint('settings', 'auth_timeout')):
        assert isinstance(credentials_storage,
                          (str, bytes, bytearray, pathlib.Path))

        if not os.path.isfile(credentials_storage):
            raise UserError(msg='authorization_file={} is not a valid file path'
                            .format(credentials_storage),
                            code='AUTH_CONFIG_BAD_STORAGE')

        self.credentials_storage = credentials_storage
        self.credentials = {}
        self.required_auth = tuple()
        self.auth_timeout = auth_timeout
        self.load_credentials()

    @staticmethod
    def parse_authorized_header(request):
        if 'Authorization' not in request.headers:
            raise AuthException(msg='The Authorization header is required.',
                                code='AUTH_MISSING_AUTH_HEADER')

        auth = request.headers['Authorization']
        try:
            scheme, credentials = auth.split(b' ', 1)
        except ValueError as err:
            raise AuthException(msg='Incorrect Authorization header syntax.',
                                code='AUTH_BAD_AUTH_HEADER') from err

        if scheme != b'Basic':
            error_log.info('User-Agent sent an unknown authorization scheme %s',
                           scheme)
            raise AuthException(msg='Only Basic auth scheme is supported.',
                                code='AUTH_NOT_BASIC')

        try:
            login, pw = base64.b64decode(credentials).decode('utf-8').split(':')
        except (UnicodeDecodeError, binascii.Error, ValueError) as err:
            error_log.debug('Failed to decode and parse basic credentials %s.'
                            'An exception %s occurred',
                            credentials, err)
            raise AuthException(msg='Bad credentials encoding or format.',
                                code='AUTH_BAD_CRED') from err

        return login, pw

    def load_credentials(self):
        """ Reload the credentials from the self.credentials_storage file. """
        credentials = {}
        required_auth = set()

        with open(self.credentials_storage, mode='r', encoding='utf-8') as f:
            for line in f:
                bc = BasicCredentials.from_line(line)
                credentials[bc.login] = bc
                for route in bc.routes:
                    required_auth.add(route)

        self.credentials = credentials
        self.required_auth = tuple(required_auth)
        error_log.info('Routes that require auth are: %s', required_auth)

    def register_login(self, login, plain_pw, routes):
        with open(self.credentials_storage, mode='a', encoding='utf-8') as f:
            lines = [BasicCredentials.serialize_plain_text(login=login,
                                                           plain_pw=plain_pw,
                                                           routes=routes)]
            f.writelines(lines)

    def remove_login(self, login):
        with open(self.credentials_storage, mode='r', encoding='utf-8') as f:
            lines = f.read()

        lines = [l for l in lines if not l.startswith(login)]

        with open(self.credentials_storage, mode='w', encoding='utf-8') as f:
            f.writelines(lines)

    def check(self, request, address):
        """ Authenticates a request coming from address.

        Returns a two-tuple with first element a boolean whether the
        authentication was successful. The second element is present if the
        authentication was not successful and is a response that can be sent
        back to the client.
        """
        raw_route = request.request_line.request_target.path
        route = hutils.normalized_route(raw_route)

        if not any(route.startswith(r) for r in self.required_auth):
            return True, None

        try:
            login, pw = self.parse_authorized_header(request)
        except AuthException:
            return False, hutils.build_response(
                401, headers={'WWW-Authenticate': 'Basic'}
            )

        error_log.debug('Validating credentials of address %s on route %s',
                        address, route)

        if self.credentials[login].match_credentials(login, pw):
            return True, None
        else:
            return False, hutils.build_response(403)
