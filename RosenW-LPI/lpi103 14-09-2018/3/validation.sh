#!/bin/bash
allLines=`cat ~/Downloads/access.log | wc -l`
lineCount=0
while read p; do
  if [[ $p =~ ^[a-Z0-9\.\-]+:[0-9]+" "[0-9\.]+" - - ["[0-9]+"/"[a-Z]+"/"[0-9\:]+" "[\+0-9]+"] "\"[^\"]+\"" "[0-9]+" "[0-9]+" "[0-9]+" "\"[^\"]+\"" "\"[^\"]+\"" - "[0-9]+" - "[0-9]+$ ]]; then
    ((lineCount++))
  fi
done <~/Downloads/access.log

echo "Valid line count: $lineCount"
echo "Invalid line count: $((allLines-lineCount))"
