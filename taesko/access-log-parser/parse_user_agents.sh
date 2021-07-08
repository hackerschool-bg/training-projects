#/usr/bin/sh
awk -F '"' 'NF == 7 { print $6 }' access.log | awk '{ print $1 }' | sort -n | uniq -c | sort -nr
