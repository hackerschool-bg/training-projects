class MyException(Exception):
   pass

def oops():
    raise MyException()

try:
    oops()
except IndexError:
    print('Index exception !!!')
except MyException:
    print('Custom exception !')
