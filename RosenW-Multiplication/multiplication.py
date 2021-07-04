numbers = ''
x = input()
if x < 0 or x >= 3200000:
    print 'number not in range'
else:
    for i in range(x):
        numbers += str ((i+1)**2)
    print numbers[x-1]
