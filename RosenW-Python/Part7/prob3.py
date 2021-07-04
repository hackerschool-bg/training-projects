def safe(func, *pargs, **kargs):
    try:
    	func(*pargs, **kargs)
    except Exception as e:
	print(type(e).__name__)

def oops():
    raise IndexError()

def key(a,b,c):
    print(a,b,c)
    raise KeyError()

safe(oops)
safe(key,1,2,3)
