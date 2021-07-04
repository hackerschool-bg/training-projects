def concatDicts(dic1, dic2):
    newD = dic1
    for k,v in dic2.items():
	newD[k] = v;
    return newD
print(concatDicts({1:2,2:4,3:10}, {7:7,8:8,1:1212}))
