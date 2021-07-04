class Scene:
    def __init__(self):
	self.cust = Customer()
	self.clerk = Clerk()
	self.parrot = Parrot()

    def action(self):
	self.cust.line()
	self.clerk.line()
	self.parrot.line()

class Customer:
    def line(self):
	print('Hello')
class Clerk:
    def line(self):
	print('Hi')
class Parrot:
    def line(self):
	print('Hi...')

s = Scene()
s.action()
