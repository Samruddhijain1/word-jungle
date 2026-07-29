const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL

export type SolverDifficulty = "easy" | "medium" | "hard" | "any"
export type SolverAlgorithm = "bidirectional" | "astar" | "genetic"

export type SolveApiResponse = {
  path: string[] | null
  steps: number | null
  message?: string | null
}

export type HintApiResponse = {
  hint: string | null
  message?: string | null
}

export type CompareRow = {
  algorithm: "bidirectional" | "astar" | "genetic"
  steps: number | null
  time_ms: number
  nodes: number
  optimal: boolean
  consistent: boolean
}

export type CompareApiResponse = {
  rows: CompareRow[]
}

export async function validateWord(word: string): Promise<boolean> {
  // Try Python backend if configured
  if (API_BASE) {
    try {
      const res = await fetch(`${API_BASE.replace(/\/+$/, "")}/validate-word`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word }),
      })
      if (res.ok) {
        const data = (await res.json()) as { valid: boolean }
        return !!data.valid
      }
      // Non-200 -> fall back
      console.warn("[v0] validate-word backend returned non-200 status:", res.status)
    } catch (err) {
      console.warn("[v0] validate-word backend error, falling back to local:", (err as Error).message)
    }
  }

  // Fallback to local dictionary
  const { isValidDictionaryWord } = await import("./words-dictionary")
  return isValidDictionaryWord(word)
}

export async function solvePath(
  start: string,
  end: string,
  difficulty: SolverDifficulty = "any",
  algorithm: SolverAlgorithm = "bidirectional",
): Promise<SolveApiResponse | null> {
  if (!API_BASE) {
    return null
  }
  try {
    const res = await fetch(`${API_BASE.replace(/\/+$/, "")}/solve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ start, end, difficulty, algorithm }),
    })
    if (!res.ok) return null
    return (await res.json()) as SolveApiResponse
  } catch {
    return null
  }
}

export async function getHint(
  current: string,
  end: string,
  difficulty: SolverDifficulty = "any",
  algorithm: SolverAlgorithm = "bidirectional",
): Promise<HintApiResponse | null> {
  if (!API_BASE) {
    return null
  }
  try {
    const res = await fetch(`${API_BASE.replace(/\/+$/, "")}/hint`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current, end, difficulty, algorithm }),
    })
    if (!res.ok) return null
    return (await res.json()) as HintApiResponse
  } catch {
    return null
  }
}

export async function compareAlgorithms(
  start: string,
  end: string,
  difficulty: SolverDifficulty = "any",
): Promise<CompareApiResponse | null> {
  if (!API_BASE) {
    return null
  }
  try {
    const res = await fetch(`${API_BASE.replace(/\/+$/, "")}/compare`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ start, end, difficulty }),
    })
    if (!res.ok) return null
    return (await res.json()) as CompareApiResponse
  } catch {
    return null
  }
}
