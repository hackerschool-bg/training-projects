import operator
dic = {3: 'asd', 1: 'qwe', 2: 'cxz'}
sortedDic =  sorted(dic.items(), key=operator.itemgetter(1))
print(sortedDic)
