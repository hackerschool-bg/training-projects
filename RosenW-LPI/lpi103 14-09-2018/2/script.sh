#!/bin/bash
cat ~/Downloads/access.log | grep -Po '\[.*\] .* /.* - [0-9]+ - [0-9]+' | grep -Po ' /.*' | awk -F '".*"' '{print $1 $2}' | awk -F ' ' '{print $1 " " $4}' | awk -F '[\.\?].* ' '{print $1 " " $2}' | awk '$2>5000000' | sort -nr | awk -F ' ' '{print $1}' | uniq -c | sort -nr
