def oops():
    raise IndexError()

try:
    oops()
except IndexError:
    print('Error caught')
