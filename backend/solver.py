from collections import deque
from heapq import heappop, heappush
import random
from time import perf_counter
from typing import Dict, List, Optional, Set, Tuple

ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

def neighbors(word: str, words: Set[str]) -> List[str]:
    W = word.upper()
    n = len(W)
    out: List[str] = []
    for i in range(n):
        for c in ALPHABET:
            if c == W[i]:
                continue
            cand = W[:i] + c + W[i + 1 :]
            if cand in words:
                out.append(cand)
    return out

def bfs_shortest_path(start: str, end: str, words: Set[str]) -> Optional[List[str]]:
    S, T = start.upper(), end.upper()
    if len(S) != len(T):
        return None
    if S == T:
        return [S]
    # restrict to same-length words to reduce branching
    pool = {w for w in words if len(w) == len(S)}
    if S not in pool or T not in pool:
        return None

    q: deque[str] = deque([S])
    parent: Dict[str, Optional[str]] = {S: None}
    seen: Set[str] = {S}

    while q:
        cur = q.popleft()
        for nb in neighbors(cur, pool):
            if nb in seen:
                continue
            seen.add(nb)
            parent[nb] = cur
            if nb == T:
                path: List[str] = [T]
                p = parent[T]
                while p is not None:
                    path.append(p)
                    p = parent[p]  # type: ignore[index]
                path.reverse()
                return path
            q.append(nb)
    return None


def bfs_bidirectional(start: str, end: str, words: Set[str]) -> Optional[List[str]]:
    """
    Bidirectional BFS: searches from both start and end simultaneously.
    Meets in the middle for faster resolution on large dictionaries.
    Returns the shortest path as a list of words, or None if no path exists.
    """
    S, T = start.upper(), end.upper()
    if len(S) != len(T):
        return None
    if S == T:
        return [S]

    pool = {w for w in words if len(w) == len(S)}
    if S not in pool or T not in pool:
        return None

    # Forward frontier (from start)
    front_visited: Dict[str, Optional[str]] = {S: None}  # word -> parent
    front_queue: deque[str] = deque([S])

    # Backward frontier (from end)
    back_visited: Dict[str, Optional[str]] = {T: None}  # word -> parent
    back_queue: deque[str] = deque([T])

    def build_path(meeting_word: str) -> List[str]:
        # Build path from start to meeting_word
        path_forward: List[str] = []
        node: Optional[str] = meeting_word
        while node is not None:
            path_forward.append(node)
            node = front_visited[node]
        path_forward.reverse()

        # Build path from meeting_word to end
        path_backward: List[str] = []
        node = back_visited[meeting_word]
        while node is not None:
            path_backward.append(node)
            node = back_visited[node]

        return path_forward + path_backward

    while front_queue or back_queue:
        # Expand forward frontier one level
        if front_queue:
            for _ in range(len(front_queue)):
                cur = front_queue.popleft()
                for nb in neighbors(cur, pool):
                    if nb not in front_visited:
                        front_visited[nb] = cur
                        front_queue.append(nb)
                    if nb in back_visited:
                        return build_path(nb)

        # Expand backward frontier one level
        if back_queue:
            for _ in range(len(back_queue)):
                cur = back_queue.popleft()
                for nb in neighbors(cur, pool):
                    if nb not in back_visited:
                        back_visited[nb] = cur
                        back_queue.append(nb)
                    if nb in front_visited:
                        return build_path(nb)

    return None  # No path exists


def _hamming_distance(a: str, b: str) -> int:
    # Number of letter positions that differ; admissible for word-ladders where each move
    # changes exactly one letter.
    return sum(1 for i in range(len(a)) if a[i] != b[i])


def astar_shortest_path(start: str, end: str, words: Set[str]) -> Optional[List[str]]:
    """
    A* shortest path search with an admissible heuristic (Hamming distance).
    Returns the shortest path as a list of words, or None if no path exists.
    """
    S, T = start.upper(), end.upper()
    if len(S) != len(T):
        return None
    if S == T:
        return [S]

    pool = {w for w in words if len(w) == len(S)}
    if S not in pool or T not in pool:
        return None

    # (f_score, g_score, node)
    heap: List[tuple[int, int, str]] = []
    g_score: Dict[str, int] = {S: 0}
    parent: Dict[str, Optional[str]] = {S: None}

    h0 = _hamming_distance(S, T)
    heappush(heap, (h0, 0, S))

    while heap:
        _, g_cur, cur = heappop(heap)
        if cur == T:
            # Reconstruct path from S to T using `parent`
            path: List[str] = []
            node: Optional[str] = T
            while node is not None:
                path.append(node)
                node = parent[node]
            path.reverse()
            return path

        # Skip stale heap entries
        if g_cur != g_score.get(cur, g_cur):
            continue

        for nb in neighbors(cur, pool):
            tentative_g = g_cur + 1
            if tentative_g < g_score.get(nb, 10**12):
                g_score[nb] = tentative_g
                parent[nb] = cur
                f = tentative_g + _hamming_distance(nb, T)
                heappush(heap, (f, tentative_g, nb))

    return None


def genetic_shortest_path(
    start: str,
    end: str,
    words: Set[str],
    *,
    max_extra_len: int = 6,
    population_size: int = 80,
    generations: int = 120,
    tournament_k: int = 5,
) -> Optional[List[str]]:
    """
    Genetic algorithm for word-ladder paths.

    Note: This is a stochastic/approximate search and does not guarantee
    globally optimal shortest paths. It's exposed as an optional algorithm
    to explore "evolutionary" AI concepts in the game.
    """
    S, T = start.upper(), end.upper()
    if len(S) != len(T):
        return None
    if S == T:
        return [S]

    pool = {w for w in words if len(w) == len(S)}
    if S not in pool or T not in pool:
        return None

    min_len = _hamming_distance(S, T)
    max_len = min_len + max_extra_len

    def random_valid_path(L: int) -> Optional[List[str]]:
        path = [S]
        cur = S
        for _ in range(L):
            nbs = neighbors(cur, pool)
            if not nbs:
                return None
            cur = random.choice(nbs)
            path.append(cur)
        return path

    def path_fitness(path: List[str]) -> int:
        # Smaller is better. Heavily prioritize ending at T.
        last_dist = _hamming_distance(path[-1], T)
        if last_dist == 0:
            # Tie-breaker: prefer paths that stay close along the way
            return sum(_hamming_distance(w, T) for w in path)
        return last_dist * 10000 + sum(_hamming_distance(w, T) for w in path)

    def tournament_select(pop: List[List[str]]) -> List[str]:
        contenders = random.sample(pop, k=min(tournament_k, len(pop)))
        contenders.sort(key=path_fitness)
        return contenders[0]

    def repair_from(path_prefix: List[str], start_idx: int, L: int) -> Optional[List[str]]:
        # Build a valid completion from start_idx to L given the current prefix.
        # start_idx is the index in the path we will replace from onward (>=1).
        if start_idx <= 0:
            return None
        if len(path_prefix) != start_idx + 1:
            return None

        path = list(path_prefix)
        cur = path[-1]
        for _ in range(start_idx, L):
            nbs = neighbors(cur, pool)
            if not nbs:
                return None
            cur = random.choice(nbs)
            path.append(cur)
        return path

    def mutate(path: List[str], L: int) -> Optional[List[str]]:
        # Change one intermediate node, then repair forward.
        if L <= 1:
            return path
        i = random.randint(1, L - 1)
        prev = path[i - 1]
        nbs = neighbors(prev, pool)
        if not nbs:
            return None
        new_word = random.choice(nbs)

        prefix = path[:i]
        prefix.append(new_word)  # now length i+1
        repaired = repair_from(prefix, i, L)
        return repaired

    def crossover(a: List[str], b: List[str], L: int) -> Optional[List[str]]:
        # Keep prefix from a and suffix is generated by repair (validity guaranteed).
        if L <= 2:
            return random_valid_path(L)
        k = random.randint(1, L - 1)
        prefix = a[: k + 1]
        repaired = repair_from(prefix, k, L)
        if repaired is None:
            return random_valid_path(L)
        return repaired

    for L in range(min_len, max_len + 1):
        # Initialize population with valid random paths of exactly length L
        population: List[List[str]] = []
        attempts = 0
        while len(population) < population_size and attempts < population_size * 20:
            p = random_valid_path(L)
            attempts += 1
            if p is not None:
                population.append(p)
        if not population:
            continue

        # Evolve
        for _ in range(generations):
            population.sort(key=path_fitness)
            if population[0][-1] == T:
                return population[0]

            new_pop: List[List[str]] = []
            # Elitism: keep the best few
            elite_count = max(2, population_size // 10)
            new_pop.extend(population[:elite_count])

            while len(new_pop) < population_size:
                parent1 = tournament_select(population)
                parent2 = tournament_select(population)
                child = crossover(parent1, parent2, L)
                if child is None:
                    continue
                if random.random() < 0.3:
                    child = mutate(child, L)
                    if child is None:
                        continue
                new_pop.append(child)

            population = new_pop

        # If not found at this length, try a longer length.

    return None


def bfs_bidirectional_with_metrics(start: str, end: str, words: Set[str]) -> Tuple[Optional[List[str]], int, int]:
    t0 = perf_counter()
    nodes = 0

    S, T = start.upper(), end.upper()
    if len(S) != len(T):
        return None, 0, int((perf_counter() - t0) * 1000)
    if S == T:
        return [S], 1, int((perf_counter() - t0) * 1000)

    pool = {w for w in words if len(w) == len(S)}
    if S not in pool or T not in pool:
        return None, 0, int((perf_counter() - t0) * 1000)

    front_visited: Dict[str, Optional[str]] = {S: None}
    front_queue: deque[str] = deque([S])
    back_visited: Dict[str, Optional[str]] = {T: None}
    back_queue: deque[str] = deque([T])

    def build_path(meeting_word: str) -> List[str]:
        path_forward: List[str] = []
        node: Optional[str] = meeting_word
        while node is not None:
            path_forward.append(node)
            node = front_visited[node]
        path_forward.reverse()

        path_backward: List[str] = []
        node = back_visited[meeting_word]
        while node is not None:
            path_backward.append(node)
            node = back_visited[node]
        return path_forward + path_backward

    while front_queue or back_queue:
        if front_queue:
            for _ in range(len(front_queue)):
                cur = front_queue.popleft()
                nodes += 1
                for nb in neighbors(cur, pool):
                    if nb not in front_visited:
                        front_visited[nb] = cur
                        front_queue.append(nb)
                    if nb in back_visited:
                        return build_path(nb), nodes, int((perf_counter() - t0) * 1000)

        if back_queue:
            for _ in range(len(back_queue)):
                cur = back_queue.popleft()
                nodes += 1
                for nb in neighbors(cur, pool):
                    if nb not in back_visited:
                        back_visited[nb] = cur
                        back_queue.append(nb)
                    if nb in front_visited:
                        return build_path(nb), nodes, int((perf_counter() - t0) * 1000)

    return None, nodes, int((perf_counter() - t0) * 1000)


def astar_with_metrics(start: str, end: str, words: Set[str]) -> Tuple[Optional[List[str]], int, int]:
    t0 = perf_counter()
    nodes = 0

    S, T = start.upper(), end.upper()
    if len(S) != len(T):
        return None, 0, int((perf_counter() - t0) * 1000)
    if S == T:
        return [S], 1, int((perf_counter() - t0) * 1000)

    pool = {w for w in words if len(w) == len(S)}
    if S not in pool or T not in pool:
        return None, 0, int((perf_counter() - t0) * 1000)

    heap: List[tuple[int, int, str]] = []
    g_score: Dict[str, int] = {S: 0}
    parent: Dict[str, Optional[str]] = {S: None}
    heappush(heap, (_hamming_distance(S, T), 0, S))

    while heap:
        _, g_cur, cur = heappop(heap)
        nodes += 1
        if cur == T:
            path: List[str] = []
            node: Optional[str] = T
            while node is not None:
                path.append(node)
                node = parent[node]
            path.reverse()
            return path, nodes, int((perf_counter() - t0) * 1000)

        if g_cur != g_score.get(cur, g_cur):
            continue

        for nb in neighbors(cur, pool):
            tentative_g = g_cur + 1
            if tentative_g < g_score.get(nb, 10**12):
                g_score[nb] = tentative_g
                parent[nb] = cur
                heappush(heap, (tentative_g + _hamming_distance(nb, T), tentative_g, nb))

    return None, nodes, int((perf_counter() - t0) * 1000)


def genetic_with_metrics(start: str, end: str, words: Set[str]) -> Tuple[Optional[List[str]], int, int]:
    t0 = perf_counter()
    path = genetic_shortest_path(start, end, words)
    # Approximate search effort for GA using path length as a lightweight proxy.
    nodes = len(path) if path else 0
    return path, nodes, int((perf_counter() - t0) * 1000)
