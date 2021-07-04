def testPrime(y):
    x = y // 2
    while x > 1:
	if y % x == 0:
	    print(y, 'has factor', x)
	    break
	x -= 1
    else:
	print(y, 'is prime')

testPrime(121)
testPrime(6)
testPrime(13)
testPrime(23)
testPrime(15.0)
testPrime(15123.0)
testPrime(15432.0)
testPrime(154534.0)
