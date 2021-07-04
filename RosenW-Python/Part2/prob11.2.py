f = open('myfile.txt', 'r')
if f.mode == 'r':
    str = f.read()
    print(str)
