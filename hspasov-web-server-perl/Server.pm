package Server;

use strict;
use warnings;
use diagnostics;
use Try::Tiny;
use Hash::Util qw();
use POSIX qw();
use Socket qw();
use Cwd qw();
use Logger qw();
use ImportConfig qw();
use ClientConnection qw();
use Error qw(Error);
use WebServerUtils qw();
use ErrorHandling qw(assert);
use Scalar::Util qw(openhandle blessed);
use constant {
    EX_OK => 0,
    EX_SOFTWARE => 70,
    EX_OSERR => 71,
};

our $log = Logger::log();
our ($ERROR, $INFO, $WARNING, $DEBUG) = Logger::log_levels();
our %CONFIG = ImportConfig::import_config();
our %CLIENT_CONN_STATES = ClientConnection::import_client_conn_states();

sub new {
    my $class = shift;

    $SIG{CHLD} = sub {
        local $!; # if signal interrupts a system call, preserve the system call's EINTR
        my $wait_any_child_indicator = -1;

        while ((my $child_pid = waitpid($wait_any_child_indicator, POSIX::WNOHANG)) > 0) {
            $log->error($DEBUG, msg => "Child with pid $child_pid reaped. Exit status: $?");
        }
    };

    my $conn;

    socket($conn, Socket::PF_INET, Socket::SOCK_STREAM, getprotobyname('tcp')) or die(Error::->new("socket: $!", \%!));
    setsockopt($conn, Socket::SOL_SOCKET, Socket::SO_REUSEADDR, 1) or die(Error::->new("setsockopt: $!", \%!));

    my $self = {
        _conn => $conn
    };

    bless($self, $class);
    Hash::Util::lock_hashref($self);
    return $self;
}

sub run {
    my $self = shift;

    assert(openhandle($self->{_conn}));

    bind($self->{_conn}, Socket::pack_sockaddr_in($CONFIG{port}, Socket::inet_aton($CONFIG{host}))) or die(Error::->new("bind: $!", \%!));

    $log->error($DEBUG, msg => "bound");

    listen($self->{_conn}, $CONFIG{backlog}) or die(Error::->new("listen: $!", \%!));

    $log->error($INFO, msg => "listening on $CONFIG{port}");

    my $client_conn;
    my $pid;

    while (1) {
        my $process_status = EX_OK;

        try {
            # fix warning "You are exiting an eval by unconventional means", caused by the "next"
            no warnings 'exiting';

            $client_conn = $self->accept() or next;

            assert(blessed($client_conn) eq 'ClientConnection');

            $pid = fork();

            if (!defined($pid)) {
                die(Error::->new("fork: $!", \%!));
            }

            if ($pid == 0) { # child process
                $process_status = EX_OK;

                # SIGCHLD signals should only be handled by parent, discarding reaping
                $SIG{CHLD} = "DEFAULT";

                $self->stop();

                try {
                    $log->init_access_log_file();

                    # may send response to client in case of invalid request
                    $client_conn->receive_meta();

                    if ($client_conn->{state} ne $CLIENT_CONN_STATES{RECEIVING}) {
                        die(Error::->new('Client error', { CLIENT_ERR => 1 }));
                    }

                    $log->error($DEBUG, msg => 'resolving file path...');

                    assert(!ref($client_conn->{req_meta}->{target}));

                    # ignoring query params
                    my $max_fields_split = 2;
                    my @req_target_split = split (/\?/, $client_conn->{req_meta}->{target}, $max_fields_split);
                    my $req_target_path = $req_target_split[0];
                    $log->error($DEBUG, var_name => 'req_target_path', var_value => $req_target_path);

                    $log->error($DEBUG, msg => 'requested file in web server document root');

                    $client_conn->serve_static_file(WebServerUtils::resolve_static_file_path($req_target_path));
                    1;
                } catch {
                    my $exc = $_;
                    assert(blessed($exc) eq 'Error');

                    if ($exc->{origin}->{ENOENT}) {
                        $log->error($DEBUG, msg => 'ENOENT');
                        $log->error($DEBUG, msg => $exc->{msg});

                        if (grep {$_ eq $client_conn->{state}} ('ESTABLISHED', 'RECEIVING')) {
                            $client_conn->send_meta(404);
                        }
                    } elsif ($exc->{origin}->{EISDIR} or $exc->{origin}->{DIR_REQUEST}) {
                        $log->error($DEBUG, msg => 'EISDIR');
                        $log->error($DEBUG, msg => $exc->{msg});

                        if (grep {$_ eq $client_conn->{state}} ('ESTABLISHED', 'RECEIVING')) {
                            $client_conn->send_meta(404);
                        }
                    } elsif (!$exc->{origin}->{CLIENT_ERR}) {
                        $log->error($ERROR, msg => $exc->{msg});
                        $process_status = EX_SOFTWARE;

                        if (grep {$_ eq $client_conn->{state}} ('ESTABLISHED', 'RECEIVING')) {
                            $client_conn->send_meta(500);
                        }
                    }
                };

                try {
                    $client_conn->shutdown();
                    1;
                } catch {
                    my $exc = $_;

                    assert(blessed($exc) eq 'Error');

                    if (!$exc->{origin}->{ENOTCONN}) {
                        $log->error($ERROR, msg => $exc->{msg});
                        exit(EX_OSERR);
                    }
                };
            } else { # parent process
                $log->error($DEBUG, msg => "New child created with pid $pid");
            }
            1;
        } catch {
            my $exc = $_;

            $log->error($DEBUG, var_name => 'Exception', var_value => $exc);

            assert(blessed($exc) eq 'Error');

            $log->error($DEBUG, msg => $exc->{msg});
        };

        if (defined($client_conn) and $client_conn->{state} ne 'CLOSED') {
            try {
                $client_conn->close();
                1;
            } catch {
                my $exc = $_;

                assert(blessed($exc) eq 'Error');

                $log->error($DEBUG, msg => $exc->{msg});
            };
        }

        if (defined($pid) and $pid == 0) { # child
            if (defined($client_conn)) {
                my $req_line;
                my $user_agent;

                if (defined($client_conn->{req_meta})) {
                    $req_line = $client_conn->{req_meta}->{req_line_raw};
                    $user_agent = $client_conn->{req_meta}->{user_agent};
                }

                $log->access(
                    req_line => $req_line,
                    user_agent => $user_agent,
                    status_code => $client_conn->{res_meta}->{status_code},
                    content_length => $client_conn->{res_meta}->{content_length},
                );
            }

            $log->close_access_log_file();
            exit($process_status);
        }
    }
}

sub accept {
    my $self = shift;

    $log->error($DEBUG, msg => "going to accept..");

    assert(openhandle($self->{_conn}));

    my $client_conn;
    my $packed_addr = accept($client_conn, $self->{_conn}) or do {
        if ($!{EINTR}) {
            $log->error($DEBUG, msg => 'accept interrupted by signal');
            return undef;
        }

        die(Error::->new("Accept failed: $!", \%!));
    };
    my ($port, $addr) = Socket::unpack_sockaddr_in($packed_addr);

    $log->error($DEBUG, msg => "Connection accepted");
    $log->error($DEBUG, var_name => "port", var_value => $port);
    $log->error($DEBUG, var_name => "addr", var_value => Socket::inet_ntoa($addr));

    return new ClientConnection($client_conn, $port, $addr);
}

sub stop {
    my $self = shift;

    $log->error($DEBUG);

    assert(openhandle($self->{_conn}));

    close($self->{_conn}) or die(Error::->new("close: $!", \%!));
}

1;
