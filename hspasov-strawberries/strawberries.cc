#include <iostream>
#include <vector>

using namespace std;

int main() {

	int k, l, r;
	// vector< vector<bool> > isRottenNewDay;

	int goodStrawberries = 0;

	cin >> k >> l >> r;

	vector < vector <bool> >* isRottenNewDay;
	
	vector < vector <bool> >* isRottenPrevDay;

	int strawberryCol, strawberryRow;

	isRottenPrevDay = new vector < vector <bool> >(k, vector<bool>(l, false));

	isRottenNewDay = new vector < vector <bool> >(*isRottenPrevDay);

	while (cin >> strawberryRow >> strawberryCol) {
		(*isRottenPrevDay)[strawberryRow - 1][strawberryCol - 1] = true;
	}

	for (int i = 0; i < r; i++) {

		delete isRottenNewDay;
		isRottenNewDay = new vector < vector <bool> >(*isRottenPrevDay);

		for (int row = 0; row < (*isRottenPrevDay).size(); row++) {

			for (int col = 0; col < (*isRottenPrevDay)[row].size(); col++) {

				if ((*isRottenPrevDay)[row][col] == true) {
					if (row > 0) {
						(*isRottenNewDay)[row - 1][col] = true;
					}
					if (row < (*isRottenPrevDay).size() - 1) {
						(*isRottenNewDay)[row + 1][col] = true;
					}
					if (col > 0) {
						(*isRottenNewDay)[row][col - 1] = true;
					}
					if (col < (*isRottenPrevDay)[row].size() - 1) {
						(*isRottenNewDay)[row][col + 1] = true;
					}
				}
			}
		}		
		delete isRottenPrevDay;
		isRottenPrevDay = new vector < vector <bool> >(*isRottenNewDay);
	}

	for (int row = 0; row < (*isRottenPrevDay).size(); row++) {

		for (int col = 0; col < (*isRottenPrevDay)[row].size(); col++) {

			if ((*isRottenPrevDay)[row][col] == false) {
				goodStrawberries++;
			}
		}
	}

	delete isRottenPrevDay;
	delete isRottenNewDay;

	cout << goodStrawberries << endl;
	return 0;
}