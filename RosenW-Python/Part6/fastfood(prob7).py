class Lunch:
    def __init__(self):
	self.emp = Employee()
	self.cust = Customer()

    def order(self, foodName):
	self.cust.placeOrder(foodName, self.emp)

    def result(self):
	self.cust.printFood()

class Customer:
    def __init__(self):
	self.food = None

    def placeOrder(self, food, e):
	self.food = e.takeOrder(food)

    def printFood(self):
	print(self.food.name)

class Employee:
    def takeOrder(self, foodName):
	food = Food(foodName)
	return food

class Food:
    def __init__(self, name):
	self.name = name

l = Lunch()
l.order('Spaghetti')
l.result()


