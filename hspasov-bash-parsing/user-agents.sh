CORRECT_LINE_PATTERN="^[^: ]+:[0-9]+ [a-zA-Z.:0-9-]+ [^ ]+ [^ ]+ \[[^[]+\] \"[^\"]+\" [0-9]{3} [0-9]+ [0-9]+ \"[^\"]+\" \"[^\"]+\" - [0-9]+ - [0-9]+$"

if [ ! -f $1 ]
  then
    echo "Expected argument file"
    exit 1
fi

incorrect_lines=$(grep -Evn "$CORRECT_LINE_PATTERN" $1)
all_lines_count=$(cat $1 | wc -l)
incorrect_lines_count=$(echo "$incorrect_lines" | wc -l)

echo "$incorrect_lines" | sed "s/^/ERROR PARSING LINE /"
echo

grep -E "$CORRECT_LINE_PATTERN" $1 | cut -d"\"" -f6 | cut -d" " -f1 | sort | uniq -c | sort -nr

echo
echo "Successfully parsed: $((all_lines_count - incorrect_lines_count))"
echo "Unsuccessfully parsed: $incorrect_lines_count"
