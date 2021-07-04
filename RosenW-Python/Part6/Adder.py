class Adder:
    def __add__(self, x):
	return add(slef, x)
    def add(self, x, y):
	print('Not implemented')

class ListAdder(Adder):
    def add(self, x, y):
	return x + y;

class DictAdder(Adder):
    def add(self, x, y):
	z = x.copy()
	z.update(y)
	return z

a = ListAdder()
print(a.add([1,2,3], [6,7,8]))

a = DictAdder()
print(a.add({1:1,2:4,3:9}, {4:16,5:25,6:35}))
