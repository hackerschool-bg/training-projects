package ErrorHandling;

use strict;
use warnings;
use diagnostics;
use Exporter qw(import);
use Error qw(Error);

our @EXPORT = ();
our @EXPORT_OK = qw(assert);

sub assert {
    my $arg_length = scalar(@_);
    my $condition = shift;

    my ($package, $filename, $line) = caller();

    if ($arg_length != 1) {
        die(Error::->new("assert at <$filename>(L$line) called with $arg_length args. Expected 1 arg.\n"));
    }

    if ($condition) {
        return 1;
    } else {
        die(Error::->new("assert at <$filename>(L$line) failed\n"));
    }
}

1;
