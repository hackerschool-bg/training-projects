#!/usr/bin/env bash
printf "%-12s %-12s %-12s %-12s %-12s %s\n" 'cumtime' 'per-call' 'calls' 'total-time' 'per-call' 'function'
awk '
$2 ~ /^[0-9.]+$/ {
    ct = "";
    for (i = 6; i <= NF; i++) ct = ct $i " ";
    cumtime[ct] += $4; tottime[ct] += $2; count[ct]++; calls[ct] += $1;
}
END {
    for (ct in cumtime) {
        ct_avg = cumtime[ct]/count[ct]
        tott_avg = tottime[ct]/count[ct]
        calls_avg = calls[ct]/count[ct]
        printf "%-12f %-12f %-12f %-12f %-12f %s\n", ct_avg, (ct_avg)/(calls_avg), calls_avg, tott_avg, tott_avg/calls_avg, ct;
    }
}' ${1:-./data/logs/profile.log} | sort -n | tail -n ${2:-20}
grep 'in .* seconds' ${1:-./data/logs/profile.log} | awk '{ sum += $8; count ++ } END { print "Average time spent profiling:", sum/count; }'
grep 'custom worker_time -' ${1:-./data/logs/profile.log} | awk '{ sum += $6; count++ } END { print "Average worker time:", sum/count; }'
