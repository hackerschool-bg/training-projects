sample_dict = {
    'item1': 'sample text',
    'item2': 'another item',
    'third_item': 'item'
}

sample_dict_keys = list(sample_dict.keys())

sample_dict_keys.sort()

for key in sample_dict_keys:
    print('{0}: {1}'.format(key, sample_dict[key]))
