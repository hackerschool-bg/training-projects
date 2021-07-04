#!/bin/bash
cat ~/Downloads/access.log | grep -Po '^[A-z0-9\.\-\_]+:\d+ [0-9\.]+ - - [\[\]0-9A-z\/\:\s\+]+ "[^"]+" \d+ \d+ \d+ "[^"]+" "[^"]+" - \d+ - \d+$' | awk '{print $14}' | cut -d '"' -f2 | sort -n | uniq -c | sort -nr
