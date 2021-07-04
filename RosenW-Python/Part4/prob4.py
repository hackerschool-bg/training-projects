def sumKeys(myDict):
    addedValues = myDict.keys()[0]
    for key in myDict.keys()[1:]:
	addedValues += key
    return addedValues

print(sumKeys({1: 'asdad', 5: 'qweqwe', 3: 'zxczxc'}))
print(sumKeys({'a': 'asdad', '6': 'qweqwe', 'asc': 'zxczxc'}))
