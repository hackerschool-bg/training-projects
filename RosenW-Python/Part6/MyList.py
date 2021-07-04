class MyList:
    l = []
    def __getitem__(self, id):
	return self.l[id]

    def __iter__(self):
        for i in self.l:
	    yield i
    def append(self, e):
	self.l.append(e)
    def __str__(self):
	listAsStr = ''
	for i in self.l:
	     listAsStr += str(i) + ' '
	return listAsStr
    def __add__(self, x):
	self.l = self.l + x
	return l
l = MyList()
for i in l:
    print(i)
l.append(18)
l.append(19)
l+=[2,5]
print(l)

class MyListSub(MyList):
    count = 0
    def __add__(self, x):
	self.count+=1
	print('times called: ', self.count)
	self.l = self.l + x
	print(self.l)
	return l

ls = MyListSub()
ls += [2,2,2]
ls += [8,8,1,2]
print(ls)

