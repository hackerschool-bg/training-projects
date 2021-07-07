S = 'Sample string'

string_ascii_sum = 0

for character in S:
    string_ascii = ord(character)
    print(string_ascii)
    string_ascii_sum += string_ascii

print(string_ascii_sum)

print([ord(c) for c in S])
print(list(map(ord, S)))
