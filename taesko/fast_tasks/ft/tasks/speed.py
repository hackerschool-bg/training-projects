import argparse
import collections
import functools
import itertools

_Connection = collections.namedtuple('Connection', ['city_a', 'city_b', 'weight'])


class Connection(_Connection):
    def other_city(self, city):
        if city == self.city_a:
            return self.city_b
        elif city == self.city_b:
            return self.city_a
        else:
            raise ValueError("{} is not connected to {}".format(city, self))

    def can_connect_to_other(self, other):
        if isinstance(other, self.__class__):
            other = other[:-1]
        if self[:-1] == other[:-1]:
            return False
        elif self.city_b not in other:
            if self.city_a == other[0]:
                return True
            elif self.city_a == other[-1]:
                return True
        elif self.city_a not in other:
            if self.city_b == other[0]:
                return True
            elif self.city_b == other[-1]:
                return True
        return False

    def connect_to_path(self, path):
        if self in path:
            raise ValueError("{} can't connect to {}".format(self, path))
        if self.can_connect_to_other(path[0]):
            return (self, *path)
        elif self.can_connect_to_other(path[-1]):
            return (*path, self)
        else:
            raise ValueError("{} can't connect to {}".format(self, path))

    def __repr__(self):
        return "{}{}({})".format(self.city_a, self.city_b, self.weight)

    def __hash__(self):
        return hash(self.city_a) ^ hash(self.city_b) ^ hash(self.weight)

    def __eq__(self, other):
        if not isinstance(other, self.__class__):
            return NotImplemented
        return self.weight == other.weight and self.city_a in other and self.city_b in other


class DepthFirstIterator:
    def __init__(self, graph, start, excluding_nodes=frozenset(), rtype='edges'):
        # TODO FIX bug iterator returns two singly connected nodes with a path going to one and then backwards
        self.graph = graph
        self.start = start
        self.excluded_nodes = excluding_nodes
        self.rtype = rtype
        self.path_stack = [(start, list(self.walkable_edges(start)))]
        self.passed_cities = set()  # set of all path_stack[N][0] nodes, excluding the last
        self.current_path = ()  # current path for the iterable

    @property
    def current_city(self):
        return self.path_stack[-1][0]

    @property
    def next_edges(self):
        return self.path_stack[-1][1]

    def walkable_edges(self, node):
        for edge in self.graph[node]:
            if not (edge.city_a in self.excluded_nodes or edge.city_b in self.excluded_nodes):
                yield edge

    def __next__(self):
        if not self.path_stack:
            raise StopIteration()
        while not self.can_advance():
            self.backtrack()
            if not self.path_stack:
                raise StopIteration()
        return self.advance()

    def __iter__(self):
        return self

    def can_advance(self):
        has_edges = bool(self.next_edges)
        is_circular = self.current_city in self.passed_cities
        return has_edges and not is_circular

    def advance(self):
        assert self.can_advance()
        edge = self.next_edges.pop()
        if self.rtype == 'edges':
            self.current_path += (edge,)
        else:
            self.current_path += (self.current_city,)
        city = edge.other_city(self.current_city)
        self.passed_cities.add(self.current_city)
        frame = (city, list(self.walkable_edges(city)))
        self.path_stack.append(frame)
        return self.current_path

    def backtrack(self):
        assert not self.path_stack or self.current_city in self.passed_cities or not self.next_edges
        self.path_stack.pop()
        if self.passed_cities:
            self.passed_cities.remove(self.current_city)
        self.current_path = self.current_path[:-1]


# class SolutionFinder:
#     def __init__(self, city_dict):
#         self.city_dict = city_dict
#         speed_list = sorted(set(conn.weight for connections in city_dict.values() for conn in connections))
#         speed_twins = itertools.product(itertools.islice(speed_list, 0, len(speed_list) - 1),
#                                         itertools.islice(speed_list, 1, len(speed_list) - 2))
#         speed_twins = (twin for twin in speed_twins if twin[1] - twin[0] >= 0)
#         speed_twins = sorted(speed_twins, key=lambda value: value[1] - value[0])
#         self.speed_twins = speed_twins
#         self.paths_iterable = all_paths(self.city_dict)
#         connections = self.minimum_connections(self.city_dict)
#         self.solution_map = {st: copy.deepcopy(connections) for st in self.speed_twins}
#
#     @staticmethod
#     def minimum_connections(city_dict):
#         dct = collections.defaultdict(set)
#         for city_a, connections in city_dict.items():
#             for city_b in (conn.other_city(city_a) for conn in connections):
#                 if city_b not in dct:
#                     dct[city_a].add(city_b)
#         return dct
#
#     def search(self):
#         for path in self.paths_iterable:
#             speed_range = self.speed_range_for_path(path)
#             cities = sorted(self.cities_on_path(path))
#             for speeds, solution_state in self.solution_map.items():
#                 if speeds[0] in speed_range and speeds[1] in speed_range:
#                     self.cities_are_connected_at_speed(speeds, cities)
#
#     def cities_are_connected_at_speed(self, speeds, cities):
#         for city in cities[1:]:
#             for other_city in cities[:-1]:
#                 self.solution_map[speeds][city].discard(other_city)
#             if not self.solution_map[speeds][city]:
#                 del self.solution_map[speeds][city]
#
#     @staticmethod
#     def cities_on_path(path):
#         for connection in path:
#             yield connection.city_a
#             yield connection.city_b
#
#     @staticmethod
#     def speed_range_for_path(path):
#         weights = (conn.weight for conn in path)
#         return range(min(weights), max(weights))


def all_paths_from(city_dict, city_a):
    yield from DepthFirstIterator(city_dict, city_a)


def all_paths(city_dict):
    exclucions = itertools.accumulate(itertools.chain([[None]], city_dict.keys()),
                                      lambda lst, city: lst + [city])
    for city, excluded in zip(city_dict, exclucions):
        yield from DepthFirstIterator(city_dict, city)


def cities_on_path(path):
    for connection in path:
        yield connection.city_a
        yield connection.city_b


def is_solution(needed_connections, paths, minimal, maximum):
    cut_connections = [conn for connections in needed_connections.values()
                       for conn in connections if not minimal <= conn.weight <= maximum]
    for cut in cut_connections:
        paths = [p for p in paths if cut not in p]
    needed_connections = {city_a: set(conn.other_city(city_a) for conn in connections)
                          for city_a, connections in needed_connections.items()}
    reached_cities = collections.defaultdict(set)
    for path in paths:
        on_path = tuple(cities_on_path(path))
        for city_a in itertools.islice(on_path, 0, len(on_path) - 1):
            for city_b in itertools.islice(on_path, 1, len(on_path)):
                reached_cities[city_a].add(city_b)
    for city_a, other in needed_connections.items():
        for city_b in other:
            if city_b not in reached_cities[city_a]:
                return False
    return True


def graph_components(city_dict):
    not_visited_cities = set(city_dict.keys())
    while not_visited_cities:
        city = not_visited_cities.pop()
        visited = frozenset(city_dict.keys()) - not_visited_cities - {city}
        new_cities = list(cities for cities in DepthFirstIterator(graph=city_dict, start=city,
                                                                  excluding_nodes=visited, rtype='nodes'))
        new_cities = functools.reduce(frozenset.union, new_cities, frozenset())
        yield new_cities
        not_visited_cities -= new_cities


def cut_graph(city_dict, min_weight, max_weight):
    return {city: [conn for conn in connections if min_weight<=conn.weight<=max_weight]
            for city, connections in city_dict.items()}


def is_solution_2(city_dict, min_weight, max_weight):
    original_count = len(tuple(graph_components(city_dict)))
    new_count = len(tuple(graph_components(cut_graph(city_dict, min_weight, max_weight))))
    return new_count == original_count


def find_solutions(city_dict):
    speed_list = sorted(set(conn.weight for connections in city_dict.values() for conn in connections))
    speed_twins = itertools.product(itertools.islice(speed_list, 0, len(speed_list) - 1),
                                    itertools.islice(speed_list, 1, len(speed_list)))
    speed_twins = (twin for twin in speed_twins if twin[1] - twin[0] >= 0)
    speed_twins = sorted(speed_twins, key=lambda value: value[1] - value[0])
    for a, b in speed_twins:
        if is_solution_2(city_dict, a, b):
            yield a, b


def best_solution(solutions):
    return next(solutions)


def parse_input(string):
    lines = string.splitlines()[1:]
    city_dict = collections.defaultdict(list)
    for line in lines:
        ca, cb, s = line.split(' ')
        s = int(s)
        city_dict[ca].append(Connection(ca, cb, s))
        city_dict[cb].append(Connection(cb, ca, s))
    return city_dict


def test(city_dict, expected):
    solutions = find_solutions(city_dict)
    best = best_solution(solutions)
    assert best == expected


def test_input(string, expected):
    test(parse_input(string), expected)
    print("Passed.")


def debug(sample_input, expected):
    city_dict = parse_input(sample_input)
    paths = list(all_paths(city_dict))
    print(expected, "is solution", is_solution(city_dict, paths, *expected))
    solutions = find_solutions(city_dict)
    print("all solutions:", solutions)
    print("best solution:", best_solution(solutions))


def main():
    city_dict_1 = {
        'A': [Connection('A', 'C', 50), Connection('A', 'B', 90), Connection('A', 'C', 10)],
        'B': [Connection('B', 'A', 90), Connection('B', 'C', 70), Connection('B', 'D', 40)],
        'C': [Connection('C', 'A', 50), Connection('C', 'B', 70), Connection('C', 'A', 10)],
        'D': [Connection('D', 'B', 40)],
        '1': [Connection('1', '2', 20)],
        '2': [Connection('2', '1', 20)],
    }
    # print(list(DepthFirstIterator(city_dict_1, 'A', rtype='nodes')))
    # print(list(DepthFirstIterator(city_dict_1, 'A', rtype='edges')))
    # print(list(graph_components(city_dict_1)))
    # cut_map = cut_graph(city_dict_1, 70, 90)
    # print(cut_map)
    # print(list(DepthFirstIterator(cut_map, '1')))
    # print(list(graph_components(cut_map)))
    # print(list(find_solutions(city_dict_1)))
    # print(list(graph_components(cut_graph(city_dict_1, 70, 90))))
    # test_input(open('input_2.txt', mode='r').read(), (3, 7))
    # test_input(open('input_3.txt', mode='r').read(), (5, 19))
    # print(list(all_paths(parse_input(open('input_1.txt', mode='r').read()))))
    parser = argparse.ArgumentParser()
    parser.add_argument('input_file')

    args = parser.parse_args()
    graph = parse_input(open(args.input_file, mode='r').read())

    for sol in find_solutions(graph):
        print(sol)


if __name__ == '__main__':
    main()
