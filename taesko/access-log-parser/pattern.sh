#!/bin/sh
awk_code='
BEGIN {
    FPAT = "([^ ]+)|(\"[^\"]+\")"
}


{
    print "NF = ", NF
    for (i = 0; i <= NF; i++) {
        printf("$%d = <%s>\n", i, $i)
    }
}
'
awk "${awk_code}" access.log

