class Animal:
    def speak(self):
	print('Animal')
class Mammal(Animal):
    def speak(self):
	print('Mammal')
class Cat(Mammal):
    def speak(self):
	print('Meow')
class Dog(Mammal):
    def speak(self):
	print('Woof')
class Primate(Mammal):
    def speak(self):
	print('Hello')
class Hacker(Primate):
    def __init__(self):
	self.name = 'gosho'

d = Dog()
c = Cat()
p = Primate()
h = Hacker()

d.speak()
c.speak()
p.speak()
h.speak()
print(h.name)
