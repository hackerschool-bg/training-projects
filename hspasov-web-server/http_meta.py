from collections import namedtuple

RequestMeta = namedtuple('RequestMeta', [
    'req_line_raw',
    'method',
    'target',
    'query_string',
    'http_version',
    'headers',
    'user_agent',
])


class ResponseMeta:
    def __init__(self):
        self.packages_sent = 0
        self.headers = {}
        self.status_code = None
