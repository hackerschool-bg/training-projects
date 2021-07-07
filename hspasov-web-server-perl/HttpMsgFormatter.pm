package HttpMsgFormatter;

use strict;
use warnings;
use diagnostics;
use Logger qw();
use Hash::Util qw();
use Exporter qw();
use URI::Escape qw();
use Scalar::Util qw(looks_like_number);
use WebServerUtils qw();
use ErrorHandling qw(assert);
use constant RESPONSE_REASON_PHRASES => {
    200 => 'OK',
    400 => 'Bad Request',
    404 => 'Not Found',
    408 => 'Request Timeout',
    500 => 'Internal Server Error',
    502 => 'Bad Gateway',
    503 => 'Service Unavailable',
};

our $log = Logger::log();
our ($ERROR, $INFO, $WARNING, $DEBUG) = Logger::log_levels();

our @EXPORT = ();
our @EXPORT_OK = qw(parse_req_meta build_res_meta);

sub parse_req_meta {
    my $msg = shift;

    $log->error($DEBUG);

    assert(!ref($msg));

    my $max_fields_split = 2;
    my @msg_parts = split(/\r\n\r\n/, $msg, $max_fields_split);

    $log->error($DEBUG, var_name => 'msg_parts', var_value => \@msg_parts);

    if (@msg_parts != 2) {
        return undef;
    }

    my @request_line_and_headers = split(/\r\n/, $msg_parts[0]);
    $log->error($DEBUG, var_name => 'request_line_and_headers', var_value => \@request_line_and_headers);

    my $request_line = $request_line_and_headers[0];
    $log->error($DEBUG, var_name => 'request_line', var_value => $request_line);

    my @req_line_tokens = split(/ /, $request_line);
    $log->error($DEBUG, var_name => 'req_line_tokens', var_value => \@req_line_tokens);

    if (@req_line_tokens != 3) {
        return undef;
    }

    my @allowed_methods = ('GET', 'POST');

    my $method = $req_line_tokens[0];

    if (!grep {$_ eq $method} @allowed_methods) {
        return undef;
    }

    my $target = URI::Escape::uri_unescape($req_line_tokens[1]);

    my $query_string;

    if (index($target, '?') != -1) {
        my $max_fields_split = 2;
        my @target_split = split(/\?/, $target, $max_fields_split);
        my $target_query_part = $target_split[1];

        if (length($target_query_part) > 0) {
            $query_string = $target_query_part;
        } else {
            $query_string = undef;
        }
    } else {
        $query_string = undef;
    }

    my %headers;

    my @headers_not_parsed = @request_line_and_headers[1..$#request_line_and_headers];

    $log->error($DEBUG, var_name => 'headers_not_parsed', var_value => \@headers_not_parsed);

    foreach (@headers_not_parsed) {
        my $max_fields_split = 2;
        my @header_field_split = split(/:/, $_, $max_fields_split);
        my $field_name = $header_field_split[0];

        if (length($field_name) != length(WebServerUtils::trim($field_name))) {
            return undef;
        }

        my $field_value = WebServerUtils::trim($header_field_split[1]);

        $headers{$field_name} = $field_value;
    }

    $log->error($DEBUG, var_name => 'headers', var_value => \%headers);

    my $body = $msg_parts[1];
    $log->error($DEBUG, var_name => 'body', var_value => $body);

    my $user_agent;

    if (exists($headers{'User-Agent'})) {
        $user_agent = $headers{'User-Agent'};
    } else {
        $user_agent = undef;
    }

    my %result = (
        req_line_raw => $request_line,
        method => $method,
        target => $target,
        query_string => $query_string,
        http_version => $req_line_tokens[2],
        headers => \%headers,
        user_agent => $user_agent,
    );

    Hash::Util::lock_hash(%result);

    $log->error($DEBUG, var_name => 'result', var_value => \%result);

    return \%result;
}

sub build_res_meta {
    my %params = @_;
    my $status_code = $params{status_code};
    my %headers = %{ $params{headers} } or ();
    my $body = $params{body} // '';

    $log->error($DEBUG);

    assert(looks_like_number($status_code));
    assert(exists(RESPONSE_REASON_PHRASES->{$status_code}));
    assert(!ref($body));

    my $result = "HTTP/1.1 $status_code " . RESPONSE_REASON_PHRASES->{$status_code};

    while (my ($field_name, $field_value) = each %headers) {
        $result .= "\r\n$field_name: $field_value";
    }

    $result .= "\r\n\r\n$body";

    return $result;
}

1;
