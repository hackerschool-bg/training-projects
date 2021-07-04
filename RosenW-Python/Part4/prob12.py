import functools, operator, math
def factRecursion(n):
    if n == 1: return 1
    return n*factRecursion(n-1)

def factReduce(n):
    return functools.reduce(operator.mul, xrange(1, n+1))

def factLoop(n):
    fact = 1;
    for i in range(n):
	fact*=(i+1)
    return fact


print(factRecursion(6))
print(factReduce(6))
print(factLoop(6))
print(math.factorial(6))
