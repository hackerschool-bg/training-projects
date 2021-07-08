import abc

import pachu.validation
from pachu.err import assertPeer, PeerError


class BaseProtocol:
    name = NotImplemented
    format = NotImplemented
    query_params = NotImplemented
    content_types = NotImplemented

    @abc.abstractmethod
    def normalize(self, inplace=True):
        raise NotImplementedError()

    @abc.abstractmethod
    def validate(self):
        raise NotImplementedError()

    @classmethod
    def is_requested(cls, query_param=None, content_type=None):
        return (query_param.lower() in cls.query_params or
                content_type.lower() in cls.content_types)


class JSONRPC(BaseProtocol):
    name = 'jsonrpc'
    query_params = {'json'}
    content_types = {'application/json'}

    def __init__(self, body):
        self.body = body

    def validate(self):
        return pachu.validation.validate_request_through_protocol(self.body,
                                                                  self.name)

    @property
    def method(self):
        return self.body['method']

    @property
    def params(self):
        return self.body['parameters']

    def normalize(self, inplace=True):
        return self.body


class YAMLRPC(BaseProtocol):
    name = 'yamlrpc'
    format = 'yaml'
    query_params = {'yaml'}
    content_types = {'text/yaml'}

    def __init__(self, body):
        self.body = body

    def validate(self):
        return pachu.validation.validate_request_through_protocol(self.body,
                                                                  self.name)

    @property
    def method(self):
        return self.body['action']

    @property
    def params(self):
        return self.body['parameters']

    def normalize(self, inplace=True):
        if inplace:
            self.body['method'] = self.body['action']
            self.body['params'] = self.body['parameters']
        else:
            raise NotImplementedError()

        return self.body


def normalize_request(body, content_type='', query_param=''):
    query_param = query_param or ''
    content_type = content_type or ''
    assert isinstance(content_type, str)
    assert isinstance(query_param, str)

    assertPeer(content_type or query_param and not content_type == query_param,
               msg=("Specifying different Content-Type header and "
                    "'format' query parameter is not allowed"),
               code='API_DIFFERENT_FORMATS')

    format_ = content_type or query_param
    requested = filter(lambda cls: cls.is_requested(content_type=content_type,
                                                    query_param=query_param),
                       BaseProtocol.__subclasses__())

    try:
        protocol_cls = next(requested)
        assert len(tuple(requested)) == 0
    except StopIteration:
        raise PeerError(msg='Unsupported format {}'.format(format_),
                        code='API_UNSUPPORTED_FORMAT')

    protocol = protocol_cls(body)
    protocol.validate()

    return protocol.normalize()
