package models;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class Node {
    private int id;
    private Map<Node, List<Integer>> connections = new HashMap();

    public Node(int id) {
        this.setId(id);
    }

    public void addConnection(Node node, Integer opt){
        if(connections.containsKey(node)){
            connections.get(node).add(opt);
        }else{
            List<Integer> tempList = new ArrayList();
            tempList.add(opt);
            connections.put(node, tempList);
        }
    }

    public Map<Node, List<Integer>> getConnections() {
        return connections;
    }

    public void setConnections(Map<Node, List<Integer>> connections) {
        this.connections = connections;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }
}
