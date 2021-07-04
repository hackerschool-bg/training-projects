def adder(*args):
    addedValues = args[0]
    for i in args[1:]:
	addedValues += i
    return addedValues
print(adder(101,2,12))
print(adder('a','b','qqqweqwesa'))
print(adder([1,6,'asd'],[1,1,1,1,1],[[]]))
