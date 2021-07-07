import urllib.parse
from log import log, DEBUG
from http_meta import RequestMeta


class HTTP1_1MsgFormatter:
    response_reason_phrases = {
        b'200': b'OK',
        b'400': b'Bad Request',
        b'404': b'Not Found',
        b'408': b'Request Timeout',
        b'500': b'Internal Server Error',
        b'502': b'Bad Gateway',
        b'503': b'Service Unavailable',
    }

    @staticmethod
    def parse_req_meta(msg):
        log.error(DEBUG, msg='parse_req_meta')

        assert type(msg) is bytes

        msg_parts = msg.split(b'\r\n\r\n', 1)
        log.error(DEBUG, var_name='msg_parts', var_value=msg_parts)

        if len(msg_parts) != 2:
            return None

        request_line_and_headers = msg_parts[0].split(b'\r\n')
        log.error(DEBUG, var_name='request_line_and_headers',
                  var_value=request_line_and_headers)

        request_line = request_line_and_headers[0]
        log.error(DEBUG, var_name='request_line',
                  var_value=request_line)

        req_line_tokens = request_line.split(b' ')
        log.error(DEBUG, var_name='req_line_tokens',
                  var_value=req_line_tokens)

        if len(req_line_tokens) != 3:
            return None

        method = req_line_tokens[0]

        if method not in (b'GET', b'HEAD', b'POST', b'PUT', b'DELETE',
                          b'CONNECT', b'OPTIONS', b'TRACE'):
            return None

        target = urllib.parse.unquote(req_line_tokens[1].decode())

        if '?' in target:
            target_query_part = target.split('?', 1)[1]

            if len(target_query_part) > 0:
                query_string = target_query_part
            else:
                query_string = None
        else:
            query_string = None

        headers = {}

        log.error(DEBUG, var_name='headers not parsed',
                  var_value=request_line_and_headers[1:])

        for header_field in request_line_and_headers[1:]:
            header_field_split = header_field.split(b':', 1)

            if len(header_field_split[0]) != len(
                header_field_split[0].strip()
            ):
                return None

            field_name = header_field_split[0]
            field_value = header_field_split[1].strip()
            headers[field_name] = field_value

        log.error(DEBUG, var_name='headers', var_value=headers)

        body = msg_parts[1]
        log.error(DEBUG, var_name='body', var_value=body)

        user_agent = headers['User-Agent'] if 'User-Agent' in headers else None

        result = RequestMeta(
            req_line_raw=request_line.decode(),
            method=method,
            target=target,
            query_string=query_string,
            http_version=req_line_tokens[2],
            headers=headers,
            user_agent=user_agent,
        )
        log.error(DEBUG, var_name='result', var_value=result)

        return result

    @staticmethod
    def build_res_meta(status_code, headers={}, body=b''):
        log.error(DEBUG, var_name='status_code', var_value=status_code)
        log.error(DEBUG, var_name='headers', var_value=headers)
        log.error(DEBUG, var_name='body', var_value=body)

        assert type(status_code) is bytes
        assert type(headers) is dict
        assert type(body) is bytes
        assert status_code in HTTP1_1MsgFormatter.response_reason_phrases

        result = (b'HTTP/1.1 ' + status_code + b' ' +
                  HTTP1_1MsgFormatter.response_reason_phrases[status_code])

        for field_name, field_value in headers.items():
            result += (b'\r\n' + field_name + b': ' + field_value)

        result += (b'\r\n\r\n' + body)

        log.error(DEBUG, var_name='result', var_value=result)

        return result
