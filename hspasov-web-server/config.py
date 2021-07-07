import os
import sys
import json
from error_handling import assert_user

assert_user(len(sys.argv) == 2, 'Expected argument config file')
assert_user(os.path.isfile(sys.argv[1]),
            'File not found. Absolute path expected!')

with open(sys.argv[1], mode='r') as config_file:
    config_file_content = config_file.read()
    CONFIG = json.loads(config_file_content)

assert_user(isinstance(CONFIG['ssl'], bool))
assert_user(isinstance(CONFIG['ssl_certificate'], str))
assert_user(isinstance(CONFIG['socket_operation_timeout'], int))
assert_user(isinstance(CONFIG['read_buffer'], int))
assert_user(isinstance(CONFIG['recv_buffer'], int))
assert_user(isinstance(CONFIG['cgi_res_meta_limit'], int))
assert_user(isinstance(CONFIG['req_meta_limit'], int))
assert_user(isinstance(CONFIG['msg_buffer_limit'], int))
assert_user(isinstance(CONFIG['backlog'], int))
assert_user(isinstance(CONFIG['protocol'], str))
assert_user(isinstance(CONFIG['host'], str))
assert_user(isinstance(CONFIG['port'], int))
assert_user(isinstance(CONFIG['user'], str))
assert_user(isinstance(CONFIG['web_server_root'], str))
assert_user(isinstance(CONFIG['document_root'], str))
assert_user(isinstance(CONFIG['cgi_dir'], str))
assert_user(isinstance(CONFIG['cgi_timeout'], int))
assert_user(isinstance(CONFIG['access_log'], str))
assert_user(isinstance(CONFIG['access_log_enabled'], bool))
assert_user(isinstance(CONFIG['error_log_level'], int))
assert_user(isinstance(CONFIG['error_log_fields'], list))
assert_user(isinstance(CONFIG['access_log_fields'], list))
assert_user(isinstance(CONFIG['access_log_field_sep'], str))
assert_user(isinstance(CONFIG['error_log_field_sep'], str))
assert_user(isinstance(CONFIG['access_log_empty_field'], str))
assert_user(isinstance(CONFIG['error_log_empty_field'], str))
assert_user(isinstance(CONFIG['accept_conn_limit'], int))
assert_user(isinstance(CONFIG['cgi_wait_batch_size'], int))
assert_user(isinstance(CONFIG['max_monits'], int))
