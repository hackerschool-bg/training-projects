def copyDict(myD):
    newD = {}
    for k,v in myD.items():
	newD[k] = v;
    return newD
print(copyDict({1:2,2:4,3:10}))
