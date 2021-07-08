#!/bin/bash
for i in {1..100}
do
    curl -H "`printf "Foo: bar\r\nblah"`" -v localhost:5678
    if [ $? -ne 0 ]; then
        break
    fi
done
echo "Total: $i requests"
