def add_dict(dict1, dict2):
    if (type(dict1) == dict and type(dict2) == dict):
        return { **dict1, **dict2 }
    elif (type(dict1) == list and type(dict2) == list):
        return dict1 + dict2
    else:
        raise Exception('Invalid arg type')

sample_dict1 = {
    'a': 1,
    'b': 2,
    'c': 3,
}

sample_dict2 = {
    'd': 4,
    'e': 63,
    'c': 32,
}

print(add_dict(sample_dict1, sample_dict2))

