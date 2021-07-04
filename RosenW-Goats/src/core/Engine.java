package core;

import java.util.*;

public class Engine {
  public void start() {
    Scanner scanner = new Scanner(System.in);

    String[] firstLine = scanner.nextLine().split(" ");
    String[] secondLine = scanner.nextLine().split(" ");

    int maxCourses = Integer.parseInt(firstLine[1]);

    List<Integer> weights = new ArrayList<>();

    for (String weight : secondLine) {
      weights.add(Integer.valueOf(weight));
    }

    weights.sort(Comparator.reverseOrder());

    int minimumSize = Collections.max(weights);

    int cycle = 0;
    List<Integer> goatsLeft = new ArrayList<>();
    transferGoats(weights, goatsLeft);
    while (true) {
      int weightOnShip = 0;
      for (int i = 0; i < goatsLeft.size(); i++) {
        int currentGoatWeight = goatsLeft.get(i);
        if (weightOnShip + currentGoatWeight <= minimumSize) {
          weightOnShip += currentGoatWeight;
          goatsLeft.remove(i--);
        }
      }
      cycle++;
      if (cycle >= maxCourses) {
        if (goatsLeft.size() == 0) {
          System.out.println(minimumSize);
          break;
        } else {
          minimumSize++;
          cycle=0;
          goatsLeft = new ArrayList<>();
          transferGoats(weights, goatsLeft);
        }
      }
    }
  }

  private void transferGoats(List<Integer> weights, List<Integer> goatsLeft) {
    for (Integer weight : weights) {
      goatsLeft.add(weight);
    }
  }
}
