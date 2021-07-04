#!/usr/bin/python
import os

query = os.environ['QUERY_STRING']

pairs = query.split('&')

a = None;
b = None;
c = None;

for pair in pairs:
    if '=' in pair:
        (k, v) = pair.split('=')
        if k == 'a' and v.isdigit():
            a = v
        if k == 'b' and v.isdigit():
            b = v

if a and b:
    c = int(a) + int(b)

print("""
    <!DOCTYPE html>
<html>
    <head>
        <title>Ultra Calculator</title>
    </head>
    <body>
        <form>
            <label>First Number: </label>
            <input type="text" name="a">
            <label>Second Number: </label>
            <input type="text" name="b">
            <input type="submit" name="" value="Calculate">
            </br>
            </br>
            <label> Result: </label>
            <input type="text" value="{}" disabled="disabled">
        </form>
    </body>
</html>""".format(c))