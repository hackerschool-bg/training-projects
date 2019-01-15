use Logger;
use ImportConfig;

our %CONFIG;
our ($log, $ERROR, $WARNING, $DEBUG, $INFO);

our %CLIENT_CONN_STATES = (
    ESTABLISHED => 'ESTABLISHED',
    RECEIVING => 'RECEIVING',
    SENDING => 'SENDING',
    CLOSED => 'CLOSED',
);

package ClientConnection;

use strict;
use warnings;
use diagnostics;
use Error qw(Error);
use Socket qw(SOL_SOCKET SO_RCVTIMEO);
use Fcntl qw();
use Scalar::Util qw(looks_like_number openhandle blessed);
use HttpMsgFormatter qw(parse_req_meta);
use ErrorHandling qw(assert);

sub new {
    my $class = shift;
    my $conn = shift;
    my $port = shift;
    my $addr = shift;

    assert(openhandle($conn));
    assert(looks_like_number($port));

    my $self = {
        _conn => $conn,
        remote_addr => $addr,
        remote_port => $port,
        _req_meta_raw => "",
        _msg_buffer => undef,
        state => $CLIENT_CONN_STATES{ESTABLISHED},
        req_meta => undef,
        res_meta => {
            packages_sent => 0,
            headers => {},
            status_code => undef,
            content_length => undef,
        },
    };

    # the argument for SO_RCVTIMEO is struct timeval
    # struct timeval:
    #   time_t tv_sec
    #   long int tv_usec
    #
    # time_t is defined as an arithmetic type, exact type not specified, but 'long' works
    # l! means use native signed long (32-bit) value
    setsockopt($self->{_conn}, Socket::SOL_SOCKET, Socket::SO_RCVTIMEO, pack('l!l!', $CONFIG{socket_operation_timeout}, 0)) or die(new Error("setsockopt: $!", \%!));

    bless($self, $class);
    return $self;
}

sub receive_meta {
    my $self = shift;

    $log->error($DEBUG);

    $self->{state} = $CLIENT_CONN_STATES{RECEIVING};

    while (length($self->{_req_meta_raw}) <= $CONFIG{req_meta_limit}) {
        $log->error($DEBUG, msg => 'receiving data...');

        eval {
            $self->receive();
            1;
        } or do {
            assert(blessed($@) eq 'Error');

            if ($@->{origin}->{EWOULDBLOCK}) {
                $log->error($DEBUG, msg => 'timeout while receiving from client');
                $self->send_meta(408);
                return;
            }
        };

        $log->error($DEBUG, var_name => '_msg_buffer', var_value => $self->{_msg_buffer});

        $self->{_req_meta_raw} .= $self->{_msg_buffer};

        if (length($self->{_msg_buffer}) == 0) {
            $log->error($DEBUG, msg => 'connection closed by peer');
            return;
        }

        if (index($self->{_req_meta_raw}, "\r\n\r\n") != -1) {
            $log->error($DEBUG, msg => 'reached end of request meta');

            my $max_fields_split = 2;
            $self->{_msg_buffer} = (split(/\r\n\r\n/, $self->{_req_meta_raw}, $max_fields_split))[1];
            last;
        }
    }

    if (length($self->{_req_meta_raw}) >= $CONFIG{req_meta_limit}) {
        $log->error($DEBUG, msg => 'request message too long');
        $self->send_meta(400);
        return;
    }

    $log->error($DEBUG, msg => 'parsing request message...');

    $self->{req_meta} = parse_req_meta($self->{_req_meta_raw});

    if (!$self->{req_meta}) {
        $log->error($DEBUG, msg => 'invalid request');
        $self->send_meta(400);
        return;
    }

    assert(ref($self->{req_meta}) eq 'HASH');

    $log->error($DEBUG, var_name => 'req_meta', var_value => $self->{req_meta});
}

sub receive {
    my $self = shift;

    $log->error($DEBUG);

    assert(openhandle($self->{_conn}));
    assert($self->{state} eq $CLIENT_CONN_STATES{RECEIVING});

    my $no_flags = 0;
    my $recv_result = recv($self->{_conn}, $self->{_msg_buffer}, $CONFIG{recv_buffer}, $no_flags);

    if (!defined($recv_result)) {
        die(new Error("recv: $!", \%!));
    }
}

sub send_meta {
    my $self = shift;
    my $status_code = shift;
    my $headers_ref = shift || {};
    my %headers = %$headers_ref;

    $log->error($DEBUG, var_name => 'status_code', var_value => $status_code);
    $log->error($DEBUG, var_name => 'headers', var_value => \%headers);

    assert(looks_like_number($status_code));

    $self->{state} = $CLIENT_CONN_STATES{SENDING};
    $self->{res_meta}->{status_code} = $status_code;

    my $result = HttpMsgFormatter::build_res_meta(
        status_code => $status_code, 
        headers => \%headers,
    );

    $log->error($DEBUG, var_name => 'result', var_value => $result);

    assert(!ref($result));

    $self->send($result);
}

sub send {
    my $self = shift;
    my $data = shift;

    $log->error($DEBUG);

    assert(!ref($data));
    assert($self->{state} eq $CLIENT_CONN_STATES{SENDING});

    my $total_data_sent_length = 0;
    my $data_to_send_length = length($data);
    my $data_to_send = $data;

    while ($total_data_sent_length  < $data_to_send_length) {
        my $no_flags = 0;
        my $data_sent_length = send($self->{_conn}, $data_to_send, $no_flags);

        if (!defined($data_sent_length)) {
            die(new Error("send: $!", \%!));
        }

        if ($data_sent_length == 0) {
            # TODO error
            $log->error($DEBUG, msg => '0 bytes sent after calling send!');
        }

        $total_data_sent_length += $data_sent_length;
        $data_to_send = substr($data, $total_data_sent_length);
    }

    $log->error($DEBUG, var_name => 'data', var_value => $data);
}

sub serve_static_file {
    my $self = shift;
    my $file_path = shift;
    $log->error($DEBUG, var_name => 'file_path', var_value => $file_path);

    assert(!ref($file_path));

    sysopen(my $fh, $file_path, Fcntl::O_RDONLY) or die(new Error("sysopen: $!", \%!));

    assert(openhandle($fh));

    $log->error($DEBUG, msg => 'requested file opened');

    if (-d $fh) {
        # TODO don't use syscall error names
        die(new Error('Requested file is directory', { EISDIR => 1 }));
    }

    $self->{res_meta}->{content_length} = -s $fh;

    $log->error($DEBUG, var_name => 'content_length', var_value => $self->{res_meta}->{content_length});

    $self->{res_meta}->{headers}->{'Content-Length'} = $self->{res_meta}->{content_length};
    $self->send_meta(200, $self->{res_meta}->{headers});
    $self->{res_meta}->{packages_sent} = 1;

    while (1) {
        my $data_length = sysread($fh, my $data, $CONFIG{read_buffer});

        if (!defined($data_length)) {
          die(new Error("sysread: $!", \%!));
        }

        $log->error($DEBUG, var_name => 'data', var_value => $data);

        if ($data_length <= 0) {
            $log->error($DEBUG, msg => 'end of file reached while reading');
            last;
        }

        $self->send($data);
    }

    close($fh) or die(new Error("close: $!", \%!));
}

sub shutdown {
    my $self = shift;
    $log->error($DEBUG);

    my $shut_rdwr = 2;
    shutdown($self->{_conn}, $shut_rdwr) or die(new Error("shutdown: $!", \%!));
}

sub close {
    my $self = shift;
    $log->error($DEBUG);

    close($self->{_conn}) or die(new Error("close: $!", \%!));

    $self->{state} = $CLIENT_CONN_STATES{CLOSED};
}

1;
