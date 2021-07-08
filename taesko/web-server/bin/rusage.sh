#!/usr/bin/env bash
default_access_log=/opt/web-server/data/logs/access.log
echo cpu_time, resident_set_size, response_time, parse_time
awk '{cpu += $8+$9; mem += $10; time += $11; parse_time += $12 count++} END { print cpu/count, mem/count, time/count, parse_time/count; }' ${1:-$default_access_log}
