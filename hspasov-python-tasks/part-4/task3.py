from functools import reduce

def adder(*args):
    sum = reduce(lambda current_sum, arg: current_sum + arg, args)
    return sum

def adder2(**kwargs):
    print(type(kwargs))
    return

print(adder(1.234, 2.86))
print(adder('a', 'b'))
print(adder([1, 2, 3], [1, 3, 4]))
