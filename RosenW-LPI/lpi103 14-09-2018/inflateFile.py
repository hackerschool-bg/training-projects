import sys;
import os;

if len(sys.argv) < 2:
	print "No file path specified"
	exit()

filePath = sys.argv[1]
targetSize = 1500000000

if os.path.isfile(filePath):
	if os.path.getsize(filePath) < 500:
		print("Please select a larger file (over 500b)")
		exit()
	print("Size before: %sMb" % round(float(os.path.getsize(filePath)) / 1000000, 2))
	print("Appending Please wait...")
	f = open(filePath, "a+")
	content = f.read()
	while os.path.getsize(filePath) < targetSize:
		f.write(content)
	f.close()
	print("done")
	print("Size after: %sMb" % round(float(os.path.getsize(filePath)) / 1000000, 2))
else:
	print "File doesn't exist, check the path you specified"