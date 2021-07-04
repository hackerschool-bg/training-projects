def cd(num):
    print(num)
    if num > 0:
	cd(num-1)

cd(15)
cd(3)
