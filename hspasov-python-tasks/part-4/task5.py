def copy_dict(dict):
    new_dict = {}

    for key in dict.keys():
        new_dict[key] = dict[key]

    return new_dict

sample_dict = {
    'a': 1,
    'b': 2,
    'c': 3,
}

print(sample_dict)

copied_dict = copy_dict(sample_dict)

copied_dict['a'] = 23

print(copied_dict)
print(sample_dict)
