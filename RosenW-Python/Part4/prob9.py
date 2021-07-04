import math
l = [2,4,9,16,25]

def getRoots(list):
    for i in l:
	yield math.sqrt(i)

for i in l:
    print(math.sqrt(i)) 
print(map(lambda x:math.sqrt(x), l))
print([math.sqrt(x) for x in l])
roots = getRoots(l)
for i in roots:
    print(i)
