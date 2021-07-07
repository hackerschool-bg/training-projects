L = [1, 2, 4, 8, 16, 32, 64]
X = 5

stage = 7

if stage == 1:
    found = False
    i = 0

    while not found and i < len(L):
        if 2 ** X == L[i]:
            found = True
        else:
            i = i + 1

    if found:
        print('at index', i)
    else:
        print(X, 'not found')

elif stage == 2:
    i = 0

    while i < len(L):
        if 2 ** X == L[i]:
            print('at index', i)
            break;
        else:
            i = i + 1
    else:
        print(X, 'not found')

elif stage == 3:
    for i in L:
        if 2 ** X == i:
            print('at index', L.index(i))
            break;
    else:
        print(X, 'not found')

elif stage == 4:
    if 2 ** X in L:
        print('at index', L.index(2 ** X))
    else:
        print(X, 'not found')

elif stage == 5:
    L = []

    for i in range(7):
        L.append(2 ** i)

    if 2 ** X in L:
        print('at index', L.index(2 ** X))
    else:
        print(X, 'not found')

elif stage == 6:
    L = list(map(lambda x: 2 ** x, range(7)))

    power_of_two = 2 ** X

    if power_of_two in L:
        print('at index', L.index(power_of_two))
    else:
        print(X, 'not found')

elif stage == 7:
    L = [2 ** x for x in range(7)]

    power_of_two = 2 ** X

    if power_of_two in L:
        print('at index', L.index(power_of_two))
    else:
        print(X, 'not found')


