package ImportConfig;

use strict;
use warnings;
use diagnostics;
use Hash::Util qw();
use Scalar::Util qw(looks_like_number);
use Fcntl qw();
use JSON qw();
use Encode qw();
use Error qw(Error);
use ErrorHandling qw(assert);

if (@ARGV != 1) {
    my $arr_len = scalar(@ARGV);
    die(Error::->new('Expected 1 arg: config file!'));
}

# TODO ask is handling enconding, decoding, strings, bytes, utf8 OK?
sysopen(my $config_file, $ARGV[0], Fcntl::O_RDONLY) or die(Error::->new("Could not open config file: $!", \%!));
binmode($config_file, ':bytes') or die(Error::->new("binmode: $!", \%!));

my $config_str = do {
    local $/;
    my $data = readline($config_file);

    if (!defined($data)) {
        die(Error::->new("readline: $!", \%!));
    }

    my $str = Encode::decode_utf8($data, Encode::FB_CROAK) or die(Error::->new("decode_utf8: $!", \%!));
    $str;
};

my $config_parsed = JSON::decode_json($config_str);

close($config_file) or warn("Config file close failed: $!");

assert(looks_like_number($config_parsed->{socket_operation_timeout}));
assert(looks_like_number($config_parsed->{read_buffer}));
assert(looks_like_number($config_parsed->{recv_buffer}));
assert(looks_like_number($config_parsed->{req_meta_limit}));
assert(looks_like_number($config_parsed->{backlog}));
assert(!ref($config_parsed->{protocol}));
assert(!ref($config_parsed->{host}));
assert(looks_like_number($config_parsed->{port}));
assert(looks_like_number($config_parsed->{error_log_level}));
assert(ref($config_parsed->{error_log_fields}) eq 'ARRAY');
assert(looks_like_number($config_parsed->{access_log_enabled}));
assert(ref($config_parsed->{access_log_fields}) eq 'ARRAY');
assert(!ref($config_parsed->{access_log_field_sep}));
assert(!ref($config_parsed->{error_log_field_sep}));
assert(!ref($config_parsed->{access_log_empty_field}));
assert(!ref($config_parsed->{error_log_empty_field}));

our %CONFIG = %$config_parsed;
Hash::Util::lock_hash(%CONFIG);

sub import_config {
    return %CONFIG;
}

our @EXPORT = ();
our @EXPORT_OK = qw(import_config);

1;
