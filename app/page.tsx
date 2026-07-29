"use client"

import type React from "react"
import { isValidDictionaryWord } from "@/lib/words-dictionary"
import { useState } from "react"
import {
  compareAlgorithms,
  getHint,
  solvePath,
  validateWord,
  type CompareRow,
  type SolverAlgorithm,
  type SolverDifficulty,
} from "@/lib/word-service"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Leaf, TreePine, Flower2, Play, RotateCcw, Trophy } from "lucide-react"

// Word ladder puzzles with jungle theme
type Difficulty = "Easy" | "Medium" | "Hard"
type GameState = "menu" | "categories" | "levels" | "playing" | "won" | "lost"

type Puzzle = {
  start: string
  end: string
  difficulty: Difficulty
  steps: number
}

const EASY_PUZZLES: Puzzle[] = [
  { start: "BLAME", end: "FLAME", difficulty: "Easy", steps: 1 },
  { start: "PRICE", end: "PRIDE", difficulty: "Easy", steps: 1 },
  { start: "SCORE", end: "SHORE", difficulty: "Easy", steps: 1 },
  { start: "STORE", end: "SHORE", difficulty: "Easy", steps: 1 },
  { start: "TRAIN", end: "BRAIN", difficulty: "Easy", steps: 1 },
  { start: "FAST", end: "LOST", difficulty: "Easy", steps: 2 },
  { start: "SPARE", end: "SHORE", difficulty: "Easy", steps: 2 },
  { start: "FIRE", end: "WAVE", difficulty: "Easy", steps: 3 },
  { start: "LOVE", end: "HATE", difficulty: "Easy", steps: 3 },
  { start: "LOVE", end: "NOTE", difficulty: "Easy", steps: 3 },
]

const MEDIUM_PUZZLES: Puzzle[] = [
  { start: "OPEN", end: "EVER", difficulty: "Medium", steps: 3 },
  { start: "RAIN", end: "SOWN", difficulty: "Medium", steps: 3 },
  { start: "TREE", end: "FLEA", difficulty: "Medium", steps: 3 },
  { start: "COLD", end: "WARM", difficulty: "Medium", steps: 4 },
  { start: "GIVE", end: "TAKE", difficulty: "Medium", steps: 4 },
  { start: "GOOD", end: "LEAF", difficulty: "Medium", steps: 4 },
  { start: "HARD", end: "SAFE", difficulty: "Medium", steps: 4 },
  { start: "PLANE", end: "CRANE", difficulty: "Medium", steps: 4 },
  { start: "SLATE", end: "SHORE", difficulty: "Medium", steps: 4 },
  { start: "FALL", end: "RISE", difficulty: "Medium", steps: 5 },
]

const HARD_PUZZLES: Puzzle[] = [
  { start: "FOOL", end: "LEAD", difficulty: "Hard", steps: 5 },
  { start: "KING", end: "LAME", difficulty: "Hard", steps: 5 },
  { start: "LIFE", end: "DATA", difficulty: "Hard", steps: 5 },
  { start: "STONE", end: "SMILE", difficulty: "Hard", steps: 5 },
  { start: "WILD", end: "TAME", difficulty: "Hard", steps: 5 },
  { start: "LIVE", end: "DEAD", difficulty: "Hard", steps: 6 },
  { start: "CURE", end: "SICK", difficulty: "Hard", steps: 7 },
  { start: "HIGH", end: "LOWS", difficulty: "Hard", steps: 7 },
  { start: "PURE", end: "BELL", difficulty: "Hard", steps: 7 },
  { start: "RICH", end: "POOR", difficulty: "Hard", steps: 7 },
]

const PUZZLES: Puzzle[] = [...EASY_PUZZLES, ...MEDIUM_PUZZLES, ...HARD_PUZZLES]

const BY_DIFF: Record<Difficulty, Puzzle[]> = {
  Easy: EASY_PUZZLES,
  Medium: MEDIUM_PUZZLES,
  Hard: HARD_PUZZLES,
}

function getMovesLimitForPuzzle(p: Puzzle) {
  // steps is the allowed number of one-letter changes to reach `end`
  return Math.max(1, p.steps)
}

function getPuzzle(difficulty: Difficulty, level: number): Puzzle {
  const arr = BY_DIFF[difficulty]
  return arr[level - 1] ?? arr[0]
}

export default function WordJungle() {
  const [gameState, setGameState] = useState<GameState>("menu")
  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle>(PUZZLES[0])
  const [currentWord, setCurrentWord] = useState("")
  const [wordChain, setWordChain] = useState<string[]>([])
  const [attempts, setAttempts] = useState(0)
  const [score, setScore] = useState(0)

  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null)
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null)
  const [movesLimit, setMovesLimit] = useState<number>(getMovesLimitForPuzzle(PUZZLES[0]))
  const [optimalSteps, setOptimalSteps] = useState<number | null>(null)
  const [hintWord, setHintWord] = useState<string | null>(null)
  const [apiDifficulty, setApiDifficulty] = useState<SolverDifficulty>("medium")
  const [apiAlgorithm, setApiAlgorithm] = useState<SolverAlgorithm>("bidirectional")
  const [comparisonRows, setComparisonRows] = useState<CompareRow[] | null>(null)
  const [showComparison, setShowComparison] = useState(false)

  const getMoveCounterColor = () => {
    if (optimalSteps === null) return "text-muted-foreground"
    if (attempts > optimalSteps + 2) return "text-red-500"
    if (attempts > optimalSteps) return "text-orange-500"
    return "text-green-600"
  }

  const getApiDifficultyForWordLength = (difficulty: SolverDifficulty, wordLen: number): SolverDifficulty => {
    if (difficulty === "any") return "any"
    const expectedLen = difficulty === "easy" ? 4 : difficulty === "medium" ? 5 : 6
    // If the user-selected difficulty doesn't match the current puzzle word length,
    // the backend would filter out `start`/`end` and return no path.
    return wordLen === expectedLen ? difficulty : "any"
  }

  const startGame = (puzzle = PUZZLES[0]) => {
    setCurrentPuzzle(puzzle)
    setWordChain([puzzle.start])
    setCurrentWord("")
    setAttempts(0)
    setMovesLimit(getMovesLimitForPuzzle(puzzle))
    setOptimalSteps(null)
    setHintWord(null)
    setComparisonRows(null)
    setShowComparison(false)
    setGameState("playing")

    void (async () => {
      const effectiveDifficulty = getApiDifficultyForWordLength(apiDifficulty, puzzle.start.length)
      const solved = await solvePath(puzzle.start, puzzle.end, effectiveDifficulty, apiAlgorithm)
      if (solved && typeof solved.steps === "number") {
        setOptimalSteps(solved.steps)
      }
    })()
  }

  const resetGame = () => {
    setGameState("menu")
    setWordChain([])
    setCurrentWord("")
    setAttempts(0)
    setScore(0)
    setSelectedDifficulty(null)
    setSelectedLevel(null)
  }

  const isValidMove = (from: string, to: string): boolean => {
    if (from.length !== to.length) return false
    let differences = 0
    for (let i = 0; i < from.length; i++) {
      if (from[i] !== to[i]) differences++
    }
    return differences === 1
  }

  const submitWord = () => {
    void (async () => {
      const word = currentWord.toUpperCase()
      const lastWord = wordChain[wordChain.length - 1]

      if (word.length !== currentPuzzle.start.length) {
        alert(`Word must be ${currentPuzzle.start.length} letters long!`)
        return
      }

      if (wordChain.includes(word)) {
        alert("You already used that word!")
        return
      }

      // Ensure it's a real word from our dictionary/backend
      const backendOrLocalValid = await validateWord(word)
      if (!backendOrLocalValid && !isValidDictionaryWord(word)) {
        alert("Not a valid word!")
        return
      }

      if (!isValidMove(lastWord, word)) {
        alert("You can only change one letter at a time!")
        return
      }

      const newChain = [...wordChain, word]
      const newAttempts = attempts + 1

      setWordChain(newChain)
      setCurrentWord("")
      setAttempts(newAttempts)
      setHintWord(null)

      // Win if reached the target within the allowed moves
      if (word === currentPuzzle.end) {
        if (newAttempts <= movesLimit) {
          const bonus = Math.max(0, (movesLimit - (newAttempts - 1)) * 10)
          setScore(score + 100 + bonus)
          setGameState("won")
        } else {
          setGameState("lost")
        }
        return
      }

      // If we've used up all allowed attempts and haven't reached the end -> retry page
      if (newAttempts >= movesLimit) {
        setGameState("lost")
      }
    })()
  }

  const requestHint = () => {
    void (async () => {
      const current = wordChain[wordChain.length - 1]
      const effectiveDifficulty = getApiDifficultyForWordLength(apiDifficulty, currentPuzzle.start.length)
      const response = await getHint(current, currentPuzzle.end, effectiveDifficulty, apiAlgorithm)
      if (!response) {
        alert("Hint service unavailable.")
        return
      }
      if (!response.hint) {
        alert(response.message ?? "No path found")
        setHintWord(null)
        return
      }
      setHintWord(response.hint)
    })()
  }

  const requestComparison = () => {
    void (async () => {
      const effectiveDifficulty = getApiDifficultyForWordLength(apiDifficulty, currentPuzzle.start.length)
      const response = await compareAlgorithms(currentPuzzle.start, currentPuzzle.end, effectiveDifficulty)
      if (!response) {
        alert("Comparison service unavailable.")
        return
      }
      setComparisonRows(response.rows)
      setShowComparison(true)
    })()
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      submitWord()
    }
  }

  const goBack = () => {
    if (gameState === "categories") setGameState("menu")
    else if (gameState === "levels") setGameState("categories")
    else if (gameState === "playing" || gameState === "won" || gameState === "lost") setGameState("levels")
  }

  const startAdventure = () => {
    setSelectedDifficulty(null)
    setSelectedLevel(null)
    setGameState("categories")
  }

  const chooseDifficulty = (d: Difficulty) => {
    setSelectedDifficulty(d)
    setApiDifficulty((d.toLowerCase() as SolverDifficulty) ?? "any")
    setSelectedLevel(null)
    setGameState("levels")
  }

  const startLevel = (level: number) => {
    if (!selectedDifficulty) return
    setSelectedLevel(level)
    const puzzle = getPuzzle(selectedDifficulty, level)
    startGame(puzzle)
  }

  if (gameState === "menu") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-4 mb-6">
              <TreePine className="w-12 h-12 text-primary leaf-sway" />
              <h1 className="text-6xl font-bold text-primary text-balance">Word Jungle</h1>
              <Leaf className="w-12 h-12 text-accent leaf-sway" />
            </div>
            <p className="text-xl text-muted-foreground mb-8 text-pretty max-w-2xl mx-auto">
              Navigate through the jungle of words! Transform one word into another by changing just one letter at a
              time.
            </p>
            <div className="mb-6 flex items-center justify-center gap-3">
              <label htmlFor="difficulty" className="text-sm font-medium text-muted-foreground">
                Difficulty
              </label>
              <select
                id="difficulty"
                className="rounded-md border bg-background px-3 py-2 text-sm"
                value={apiDifficulty}
                onChange={(e) => setApiDifficulty(e.target.value as SolverDifficulty)}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div className="mb-6 flex items-center justify-center gap-3">
              <label htmlFor="algorithm" className="text-sm font-medium text-muted-foreground">
                AI Algorithm
              </label>
              <select
                id="algorithm"
                className="rounded-md border bg-background px-3 py-2 text-sm"
                value={apiAlgorithm}
                onChange={(e) => setApiAlgorithm(e.target.value as SolverAlgorithm)}
              >
                <option value="bidirectional">Bidirectional BFS</option>
                <option value="astar">A* (Heuristic)</option>
                <option value="genetic">Genetic Algorithm</option>
              </select>
            </div>

            {/* Decorative Elements */}
            <div className="flex justify-center gap-8 mb-8">
              <div className="float-animation">
                <Flower2 className="w-8 h-8 text-secondary" />
              </div>
              <div className="float-animation" style={{ animationDelay: "1s" }}>
                <Leaf className="w-6 h-6 text-primary" />
              </div>
              <div className="float-animation" style={{ animationDelay: "2s" }}>
                <TreePine className="w-10 h-10 text-accent" />
              </div>
            </div>

            <Button
              size="lg"
              className="pulse-glow text-lg px-8 py-6 bg-primary hover:bg-primary/90"
              onClick={startAdventure}
            >
              <Play className="w-6 h-6 mr-2" />
              Start Adventure
            </Button>
          </div>

          {/* How to Play */}
          <Card className="p-6 bg-card/50 backdrop-blur-sm">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <TreePine className="w-5 h-5 text-primary" />
              How to Play
            </h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-primary font-bold">1</span>
                </div>
                <p>Start with the first word</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-primary font-bold">2</span>
                </div>
                <p>Change only one letter</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-primary font-bold">3</span>
                </div>
                <p>Reach the target word</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  if (gameState === "categories") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10 p-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <Button variant="outline" onClick={goBack}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h2 className="text-2xl font-bold">Choose Category</h2>
            <div />
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card
              className="p-6 cursor-pointer hover:shadow-lg hover:scale-105 transition"
              onClick={() => chooseDifficulty("Easy")}
            >
              <h3 className="text-xl font-bold text-primary mb-2">Easy</h3>
              <p className="text-muted-foreground">10 levels to warm up</p>
            </Card>
            <Card
              className="p-6 cursor-pointer hover:shadow-lg hover:scale-105 transition"
              onClick={() => chooseDifficulty("Medium")}
            >
              <h3 className="text-xl font-bold mb-2">Medium</h3>
              <p className="text-muted-foreground">10 challenging levels</p>
            </Card>
            <Card
              className="p-6 cursor-pointer hover:shadow-lg hover:scale-105 transition"
              onClick={() => chooseDifficulty("Hard")}
            >
              <h3 className="text-xl font-bold text-destructive mb-2">Hard</h3>
              <p className="text-muted-foreground">10 expert levels</p>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (gameState === "levels" && selectedDifficulty) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10 p-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <Button variant="outline" onClick={goBack}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h2 className="text-2xl font-bold">{selectedDifficulty} — Select Level</h2>
            <div />
          </div>

          <Card className="p-4 mb-6">
            <p className="text-sm text-muted-foreground">
              Reach the target word within the move limit for this level. If you don’t, a retry page will
              appear.
            </p>
          </Card>

          <div className="grid grid-cols-5 gap-3">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((lvl) => (
              <Button key={lvl} variant="secondary" className="h-12" onClick={() => startLevel(lvl)}>
                Level {lvl}
              </Button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (gameState === "levels") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10 p-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <Button variant="outline" onClick={goBack}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Back to Categories
            </Button>
          </div>

          {/* Puzzle Levels */}
          <Card className="p-6 mb-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Choose a Level:</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((lvl) => (
                <Button
                  key={lvl}
                  onClick={() => startLevel(lvl)}
                  variant="outline"
                  className="flex-1"
                  disabled={!selectedDifficulty}
                >
                  Level {lvl}
                </Button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    )
  }

  if (gameState === "playing") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10 p-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <Button variant="outline" onClick={goBack}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Score: {score}</Badge>
              <Badge variant="outline">Steps: {attempts}</Badge>
              <Badge variant="default">Moves left: {Math.max(0, movesLimit - attempts)}</Badge>
            </div>
          </div>
          <p className={`mb-4 text-sm font-semibold ${getMoveCounterColor()}`}>
            Your moves: {attempts} | AI optimal: {optimalSteps ?? "-"}
          </p>
          <div className="mb-4">
            <Button variant="outline" onClick={requestComparison}>
              Compare Algorithms
            </Button>
          </div>
          {showComparison && comparisonRows && (
            <Card className="p-4 mb-6 overflow-x-auto">
              <h3 className="font-semibold mb-3">Algorithm Comparison (This Level)</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Algorithm</th>
                    <th className="text-left py-2">Steps</th>
                    <th className="text-left py-2">Time (ms)</th>
                    <th className="text-left py-2">Nodes</th>
                    <th className="text-left py-2">Optimal</th>
                    <th className="text-left py-2">Consistent</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr key={row.algorithm} className="border-b last:border-0">
                      <td className="py-2">{row.algorithm}</td>
                      <td className="py-2">{row.steps ?? "-"}</td>
                      <td className="py-2">{row.time_ms}</td>
                      <td className="py-2">{row.nodes}</td>
                      <td className="py-2">{row.optimal ? "Yes" : "No"}</td>
                      <td className="py-2">{row.consistent ? "Yes" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {/* Puzzle Info */}
          <Card className="p-6 mb-8 text-center">
            <div className="flex items-center justify-center gap-4 mb-4">
              <TreePine className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold">
                Transform <span className="text-primary">{currentPuzzle.start}</span> into{" "}
                <span className="text-accent">{currentPuzzle.end}</span>
              </h2>
              <Leaf className="w-6 h-6 text-accent" />
            </div>
            <p className="text-muted-foreground">
              Moves allowed: {movesLimit} • Difficulty: {currentPuzzle.difficulty}
            </p>
          </Card>

          {/* Word Chain */}
          <Card className="p-6 mb-8">
            <h3 className="text-lg font-semibold mb-4">Your Path Through the Jungle:</h3>
            <div className="flex flex-wrap gap-2">
              {wordChain.map((word, index) => (
                <div key={index} className="flex items-center">
                  <Badge
                    variant={index === 0 ? "default" : word === currentPuzzle.end ? "destructive" : "secondary"}
                    className="text-lg px-4 py-2"
                  >
                    {word}
                  </Badge>
                  {index < wordChain.length - 1 && <span className="mx-2 text-muted-foreground">→</span>}
                </div>
              ))}
            </div>
          </Card>

          {/* Input */}
          <Card className="p-6">
            <div className="flex gap-4">
              <Input
                value={currentWord}
                onChange={(e) => setCurrentWord(e.target.value.toUpperCase())}
onKeyDown={handleKeyPress}
                placeholder={`Enter ${currentPuzzle.start.length}-letter word...`}
                className="text-lg text-center font-mono"
                maxLength={currentPuzzle.start.length}
              />
              <Button onClick={submitWord} disabled={!currentWord.trim()}>
                Submit
              </Button>
              <Button variant="secondary" onClick={requestHint}>
                Hint
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Change only one letter from:{" "}
              <span className="font-mono font-bold">{wordChain[wordChain.length - 1]}</span>
            </p>
            {hintWord && (
              <p className="mt-3 rounded-md bg-accent/20 p-2 text-center text-sm font-semibold text-accent-foreground">
                Hint: try <span className="font-mono">{hintWord}</span>
              </p>
            )}
          </Card>
        </div>
      </div>
    )
  }

  if (gameState === "won") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10 flex items-center justify-center p-4">
        <div className="absolute top-4 left-4">
          <Button variant="outline" onClick={goBack}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
        <Card className="p-8 text-center max-w-md w-full">
          <div className="mb-6">
            <Trophy className="w-16 h-16 text-accent mx-auto mb-4 float-animation" />
            <h2 className="text-3xl font-bold text-primary mb-2">Jungle Conquered!</h2>
            <p className="text-muted-foreground">
              You successfully transformed <span className="font-bold">{currentPuzzle.start}</span> into{" "}
              <span className="font-bold">{currentPuzzle.end}</span>
            </p>
          </div>

          <div className="mb-6 space-y-2">
            <div className="flex justify-between">
              <span>Steps taken:</span>
              <span className="font-bold">{attempts}</span>
            </div>
            <div className="flex justify-between">
              <span>Moves allowed:</span>
              <span className="font-bold">{movesLimit}</span>
            </div>
            <div className="flex justify-between text-lg">
              <span>Final Score:</span>
              <span className="font-bold text-primary">{score}</span>
            </div>
          </div>

          <div className="flex gap-4">
            <Button onClick={resetGame} variant="outline" className="flex-1 bg-transparent">
              Play Again
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                if (!selectedLevel) return
                if (selectedLevel >= 10) {
                  resetGame()
                  return
                }
                startLevel(selectedLevel + 1)
              }}
            >
              {selectedLevel && selectedLevel >= 10 ? "Back to Menu" : "Next Challenge"}
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (gameState === "lost") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10 flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md w-full">
          <div className="mb-6">
            <RotateCcw className="w-16 h-16 text-destructive mx-auto mb-4 float-animation" />
            <h2 className="text-3xl font-bold text-destructive mb-2">Out of Moves!</h2>
            <p className="text-muted-foreground">
              You ran out of moves before reaching <span className="font-bold">{currentPuzzle.end}</span>.
            </p>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" className="flex-1 bg-transparent" onClick={goBack}>
              Back
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                // retry the same level
                startGame(currentPuzzle)
              }}
            >
              Retry
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return null
}
