#include <iostream>
#include <algorithm>
#include <vector>

bool sorting (int i, int j) {
  return i > j; // desc
}

int main() {
  int n, k;
  int weight;
  int weights_sum = 0;
  int min_result;
  std::vector<int> goat_weights;

  std::cin >> n >> k;
  for (int i = 0; i < n; i++) {
    std::cin >> weight;
    goat_weights.push_back(weight);
    weights_sum += weight;
  }

  std::vector<bool> sorted_goats_is_transfered(n);

  if (k == 1) {
    std::cout << weights_sum << std::endl;
  }

  std::sort(goat_weights.begin(), goat_weights.end(), sorting);
  min_result = goat_weights[0];

  for (int boat_size = min_result; boat_size < weights_sum; boat_size++) {
    int boat_carry = 0;
    int trips = 0;
    int j = 0;
    std::fill(sorted_goats_is_transfered.begin(), sorted_goats_is_transfered.end(), false);

    while(std::find(sorted_goats_is_transfered.begin(), sorted_goats_is_transfered.end(), false) != sorted_goats_is_transfered.end()) {
      if (sorted_goats_is_transfered[j]) {
        if (j == goat_weights.size() - 1) {
          j = 0;
          trips++;
          boat_carry = 0;
        } else {
          j++;
        }
      } else {
        if (boat_carry + goat_weights[j] <= boat_size) {
          boat_carry += goat_weights[j];
          sorted_goats_is_transfered[j] = true;
        }
        if (j == goat_weights.size() - 1 || std::find(sorted_goats_is_transfered.begin(), sorted_goats_is_transfered.end(), false) == sorted_goats_is_transfered.end()) {
          j = 0;
          trips++;
          boat_carry = 0;
        } else {
          j++;
        }
      }
    }
    if (trips <= k) {
      std::cout << boat_size << std::endl;
      break;
    }
  }
  return 0;
}