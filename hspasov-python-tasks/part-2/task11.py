with open('myfile.txt', 'w') as text_file:
    text_file.write('Hello file world!')

with open('myfile.txt', 'r') as text_file:
    data = text_file.read()
    print(data)
