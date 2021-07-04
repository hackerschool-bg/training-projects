import java.util.*;
import models.*;

public class Main {
  public static void main(String[] args) {
    Scanner scanner = new Scanner(System.in);
    String[] nm = scanner.nextLine().split(" ");
    int cities = Integer.parseInt(nm[0]);
    int roads = Integer.parseInt(nm[1]);
    Map<Integer, Node> nodes = new HashMap();

    for (int i = 1; i <= cities; i++) {
      nodes.put(i, new Node(i));
    }

    //validation
    if(cities<2 || cities>1000 || roads<1 || roads>10000) {
      System.out.println("error");
    } else {
      for (int i = 0; i < roads; i++) {
        String[] tokens = scanner.nextLine().split(" ");
        int from = Integer.parseInt(tokens[0]);
        int to = Integer.parseInt(tokens[1]);
        int speed = Integer.parseInt(tokens[2]);
        if(from < 1 || from > cities || to < 1 || to>cities || speed < 1 || speed > 30000){
          throw new IndexOutOfBoundsException();
        }else{
          //initialization
          nodes.get(from).addConnection(nodes.get(to), speed);
          nodes.get(to).addConnection(nodes.get(from), speed);
        }
      }
    }

    // calculate optimal min and max speed
    int currentMax = findMaxSpeed(nodes);
    int currentMin = findMinSpeed(nodes, currentMax);

    System.out.println(currentMin + " " + currentMax);

  }

  private static int findMaxSpeed(Map<Integer, Node> nodes) {
    boolean maxSpeedFound = false;
    int currentTestSpeed = 0;
    while (!maxSpeedFound){
      currentTestSpeed++;
      maxSpeedFound = testMaxSpeed(currentTestSpeed, nodes);
    }
    return currentTestSpeed;
  }

  private static boolean testMaxSpeed(int currentTestSpeed, Map<Integer, Node> nodes) {
    Set<Node> visitedNodes = new HashSet<>();
    Queue<Node> queue = new LinkedList<>();
    queue.add(nodes.get(1));
    visitedNodes.add(nodes.get(1));

    while (visitedNodes.size()<nodes.size() && queue.size()>0){
      Node curNode = queue.poll();
      for (Map.Entry<Node,List<Integer>> entry : curNode.getConnections().entrySet()) {
        for (Integer currentOptimalSpeed : entry.getValue()) {
            if(currentOptimalSpeed <= currentTestSpeed && !visitedNodes.contains(entry.getKey())){
              queue.add(entry.getKey());
              visitedNodes.add(entry.getKey());
            }
        }
      }
    }

    if(visitedNodes.size()==nodes.size()){
      return true;
    }

    return false;
  }

  private static boolean testMinSpeed(int currentTestSpeed, Map<Integer,Node> nodes, Integer maxSpeed) {
    Set<Node> visitedNodes = new HashSet<>();
    Queue<Node> queue = new LinkedList<>();
    queue.add(nodes.get(1));
    visitedNodes.add(nodes.get(1));

    while (visitedNodes.size()<nodes.size() && queue.size()>0){
      Node curNode = queue.poll();
      for (Map.Entry<Node,List<Integer>> entry : curNode.getConnections().entrySet()) {
        for (Integer currentOptimalSpeed : entry.getValue()) {
          if(currentOptimalSpeed <= maxSpeed && currentOptimalSpeed >= currentTestSpeed && !visitedNodes.contains(entry.getKey())){
            queue.add(entry.getKey());
            visitedNodes.add(entry.getKey());
          }
        }
      }
    }

    if(visitedNodes.size() == nodes.size()){
      return false;
    }

    return true;
  }

  private static int findMinSpeed(Map<Integer, Node> nodes, Integer maxSpeed) {
    boolean minSpeedFound = false;
    int currentTestSpeed = 0;
    while (!minSpeedFound){
      currentTestSpeed++;
      minSpeedFound = testMinSpeed(currentTestSpeed, nodes, maxSpeed);
    }
    return --currentTestSpeed;
  }
}
