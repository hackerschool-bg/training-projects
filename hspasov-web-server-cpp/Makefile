CXXFLAGS = -g -Wall -pedantic -rdynamic

OBJ = main.o

OUT = server

$(OUT): $(OBJ)
	g++ $(CXXFLAGS) $(OBJ) -lcurl -o $(OUT)

clean:
	rm -f *~ $(OUT) *.o
