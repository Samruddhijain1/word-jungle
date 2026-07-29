import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dictionary import WORDS
from solver import (
    astar_shortest_path,
    astar_with_metrics,
    bfs_bidirectional,
    bfs_bidirectional_with_metrics,
    genetic_shortest_path,
    genetic_with_metrics,
)

app = FastAPI(title="Word Jungle Backend", version="1.0.0")

# For production, set the ALLOWED_ORIGINS environment variable to your
# deployed frontend URL, e.g.: ALLOWED_ORIGINS=https://wordjungle.vercel.app
# For local development, the default "*" allows all origins.
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ValidateRequest(BaseModel):
    word: str

class ValidateResponse(BaseModel):
    valid: bool


class SolveRequest(BaseModel):
    start: str
    end: str
    difficulty: str = "any"
    algorithm: str = "bidirectional"


class SolveResponse(BaseModel):
    path: list[str] | None
    steps: int | None
    message: str | None = None


class HintRequest(BaseModel):
    current: str
    end: str
    difficulty: str = "any"
    algorithm: str = "bidirectional"


class HintResponse(BaseModel):
    hint: str | None
    message: str | None = None


class CompareRequest(BaseModel):
    start: str
    end: str
    difficulty: str = "any"


class CompareRow(BaseModel):
    algorithm: str
    steps: int | None
    time_ms: int
    nodes: int
    optimal: bool
    consistent: bool


class CompareResponse(BaseModel):
    rows: list[CompareRow]


def filter_by_difficulty(words: set[str], difficulty: str) -> set[str]:
    length_map = {"easy": 4, "medium": 5, "hard": 6}
    key = difficulty.lower()
    if key in length_map:
        return {w for w in words if len(w) == length_map[key]}
    return words  # "any" — no filter


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/validate-word", response_model=ValidateResponse)
def validate_word(req: ValidateRequest):
    w = req.word.upper()
    return {"valid": w in WORDS}


@app.get("/difficulties")
def difficulties():
    return {"difficulties": ["easy", "medium", "hard", "any"]}


@app.post("/solve", response_model=SolveResponse)
def solve(req: SolveRequest):
    start = req.start.upper()
    end = req.end.upper()
    if start == end:
        return {"path": [start], "steps": 0}

    filtered_words = filter_by_difficulty(WORDS, req.difficulty)
    algo = (req.algorithm or "").lower()
    if algo == "astar":
        path = astar_shortest_path(start, end, filtered_words)
    elif algo == "genetic":
        path = genetic_shortest_path(start, end, filtered_words)
    else:
        path = bfs_bidirectional(start, end, filtered_words)
    if not path:
        return {"path": None, "steps": None, "message": "No path found"}
    return {"path": path, "steps": len(path) - 1}


@app.post("/hint", response_model=HintResponse)
def hint(req: HintRequest):
    current = req.current.upper()
    end = req.end.upper()
    if current == end:
        return {"hint": None, "message": "Already at target"}

    filtered_words = filter_by_difficulty(WORDS, req.difficulty)
    algo = (req.algorithm or "").lower()
    if algo == "astar":
        path = astar_shortest_path(current, end, filtered_words)
    elif algo == "genetic":
        path = genetic_shortest_path(current, end, filtered_words)
    else:
        path = bfs_bidirectional(current, end, filtered_words)
    if not path:
        return {"hint": None, "message": "No path found"}
    if len(path) < 2:
        return {"hint": None, "message": "Already at target"}
    return {"hint": path[1]}


@app.post("/compare", response_model=CompareResponse)
def compare_algorithms(req: CompareRequest):
    start = req.start.upper()
    end = req.end.upper()
    filtered_words = filter_by_difficulty(WORDS, req.difficulty)

    bid_path, bid_nodes, bid_time = bfs_bidirectional_with_metrics(start, end, filtered_words)
    astar_path, astar_nodes, astar_time = astar_with_metrics(start, end, filtered_words)
    gen_path, gen_nodes, gen_time = genetic_with_metrics(start, end, filtered_words)

    step_values = [
        len(bid_path) - 1 if bid_path else None,
        len(astar_path) - 1 if astar_path else None,
        len(gen_path) - 1 if gen_path else None,
    ]
    valid_steps = [s for s in step_values if s is not None]
    best_steps = min(valid_steps) if valid_steps else None

    rows = [
        {
            "algorithm": "bidirectional",
            "steps": step_values[0],
            "time_ms": bid_time,
            "nodes": bid_nodes,
            "optimal": best_steps is not None and step_values[0] == best_steps,
            "consistent": True,
        },
        {
            "algorithm": "astar",
            "steps": step_values[1],
            "time_ms": astar_time,
            "nodes": astar_nodes,
            "optimal": best_steps is not None and step_values[1] == best_steps,
            "consistent": True,
        },
        {
            "algorithm": "genetic",
            "steps": step_values[2],
            "time_ms": gen_time,
            "nodes": gen_nodes,
            "optimal": best_steps is not None and step_values[2] == best_steps,
            "consistent": False,
        },
    ]
    return {"rows": rows}
