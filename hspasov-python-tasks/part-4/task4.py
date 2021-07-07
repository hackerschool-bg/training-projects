from functools import reduce

def adder(**kwargs):
    print(kwargs.keys())
    sum = reduce(lambda current_sum, val: current_sum + val, kwargs.values())

    return sum

print(adder(ugly = 'val', good = 'val2'))
