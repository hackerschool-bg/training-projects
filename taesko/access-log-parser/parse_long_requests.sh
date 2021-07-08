#!/bin/sh
awk_code='
NF>2 && $(NF-2) ~ /[0-9]+$/ && length($(NF-2)) >= 7 && (length($(NF-2)) > 7 || $(NF-2) ~ /^[5-9]/) && $8 ~ /^\// { print $8 }
'
awk "${awk_code}" access.log | cut -d '?' -f 1 | sort | uniq -c | sort -r

