package Error;

use strict;
use warnings;
use diagnostics;
use Hash::Util qw();

sub new {
    my ($class, $msg, $origin) = @_;
    $origin //= {};

    my $self = {
        msg => $msg,
        origin => $origin,
    };

    bless($self, $class);
    Hash::Util::lock_hashref($self);
    return $self;
}

1;
