printf 'First Script: \n'
time cat ~/Downloads/access.log | grep -Po '^[A-z0-9\.\-\_]+:\d+ [0-9\.]+ - - [\[\]0-9A-z\/\:\s\+]+ "[^"]+" \d+ \d+ \d+ "[^"]+" "[^"]+" - \d+ - \d+$' | awk '{print $14}' | cut -d '"' -f2 | sort -n | uniq -c | sort -nr > /dev/null
printf '\nSecond Script: \n'
time cat ~/Downloads/access.log | grep -Po '\[.*\] .* /.* - [0-9]+ - [0-9]+' | grep -Po ' /.*' | awk -F '".*"' '{print $1 $2}' | awk -F ' ' '{print $1 " " $4}' | awk -F '[\.\?].* ' '{print $1 " " $2}' | awk '$2>5000000' | sort -nr | awk -F ' ' '{print $1}' | uniq -c | sort -nr > /dev/null
