def countLines(f):
    return sum(1 for line in open(f))
    
def countChars(f):
    total = 0;
    for line in open(f):
	total += sum(1 for char in line)
    return total

def test(f):
    print(countLines(f))
    print(countChars(f))

if __name__ == "__main__":
   test('text.txt')
