from error.exceptions import ServerError

class ExitCodes(object):
    def __init__(self):
        self.status_exit_codes_mapping = {
            100: 101,
            101: 102,
            102: 103,
            200: 104,
            201: 105,
            202: 106,
            203: 107,
            204: 108,
            205: 109,
            206: 110,
            207: 111,
            208: 112,
            226: 113,
            300: 114,
            301: 115,
            302: 116,
            303: 117,
            304: 118,
            305: 119,
            307: 120,
            308: 121,
            400: 122,
            401: 123,
            402: 124,
            403: 125,
            404: 126,
            405: 127,
            406: 128,
            407: 129,
            408: 130,
            409: 131,
            410: 132,
            411: 133,
            412: 134,
            413: 135,
            414: 136,
            415: 137,
            416: 138,
            417: 139,
            418: 140,
            421: 141,
            422: 142,
            423: 143,
            424: 144,
            426: 145,
            428: 146,
            429: 147,
            431: 148,
            444: 149,
            451: 150,
            499: 151,
            500: 152,
            501: 153,
            502: 154,
            503: 155,
            504: 156,
            505: 157,
            506: 158,
            507: 159,
            508: 160,
            510: 161,
            511: 162,
            599: 163
        }

    def get_exit_code(self, status_code):
        if status_code in self.status_exit_codes_mapping:
            return self.status_exit_codes_mapping[status_code]
        raise ServerError('no mapping for status code {}'.format(status_code), 'NO_MAPPING_FOR_STATUS_CODE')

    def get_status_code(self, exit_code):
        for k, v in self.status_exit_codes_mapping.items():
            if v == exit_code:
                return k
        raise ServerError('no mapping for exit code {}'.format(exit_code), 'NO_MAPPING_FOR_EXIT_CODE')