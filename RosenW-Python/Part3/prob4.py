l = [1,2,4,8,16,32,64]
x = 64

i = 0;
for item in l:
    if x in l:
 	print('Found !!!')
	break
    else:
	i+=1
else:
    print('Not found...')
