/**
 * EN: Incremental jump matching over candidate identity keys (+ learned keys).
 * JA: 識別キー（＋学習済み）に対するインクリメンタル一致。
 */

export type NavJumpCandidate = {
  index: number
  matchKeys: string[]
  kind: string
  confidence: number
}

export type NavJumpMatchResult = {
  /** EN: Candidate indices ordered by rank (best first). */
  rankedIndices: number[]
}

function normalizeQuery(query: string): string {
  return query.replace(/\s+/g, " ").trim().toLowerCase()
}

function bestKeyScore(matchKeys: string[], q: string): number {
  if (q.length === 0) {
    return 0
  }
  let best = 0
  for (const key of matchKeys) {
    const k = key.toLowerCase()
    if (k === q) {
      best = Math.max(best, 100)
      continue
    }
    if (k.startsWith(q)) {
      best = Math.max(best, 80)
      continue
    }
    if (k.includes(q)) {
      best = Math.max(best, 50)
    }
  }
  return best
}

/**
 * EN: Rank candidates by query substring match; empty query → original order.
 *     Learned keys boost candidates that share a key with a learned entry matching the query.
 */
export function rankNavJumpMatches(
  candidates: readonly NavJumpCandidate[],
  query: string,
  learnedKeys: readonly string[] = []
): NavJumpMatchResult {
  const q = normalizeQuery(query)
  if (q.length === 0) {
    return { rankedIndices: candidates.map((c) => c.index) }
  }

  const learnedLower = learnedKeys.map((k) => k.toLowerCase()).filter((k) => k.length > 0)
  const learnedHitsQuery = learnedLower.filter((k) => k.includes(q) || q.includes(k))

  type Scored = { index: number; score: number; confidence: number }
  const scored: Scored[] = []

  for (const c of candidates) {
    let score = bestKeyScore(c.matchKeys, q)
    if (score === 0 && learnedHitsQuery.length > 0) {
      for (const lk of learnedHitsQuery) {
        const viaLearned = bestKeyScore(c.matchKeys, lk)
        if (viaLearned > 0) {
          score = Math.max(score, viaLearned - 10)
        }
      }
    }
    if (score <= 0) {
      continue
    }
    if (c.kind === "inert") {
      continue
    }
    scored.push({ index: c.index, score, confidence: c.confidence })
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score
    }
    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence
    }
    return a.index - b.index
  })

  return { rankedIndices: scored.map((s) => s.index) }
}

export function parseNavJumpQueryPayload(raw: string): {
  query: string
  learned: string[]
  cycleDelta: number
} {
  const trimmed = raw.trim()
  if (trimmed.length === 0) {
    return { query: "", learned: [], cycleDelta: 0 }
  }
  if (trimmed.startsWith("{")) {
    try {
      const o = JSON.parse(trimmed) as {
        query?: unknown
        learned?: unknown
        cycleDelta?: unknown
      }
      const query = typeof o.query === "string" ? o.query : ""
      const learned = Array.isArray(o.learned)
        ? o.learned.filter((x): x is string => typeof x === "string").slice(0, 200)
        : []
      const cycleDelta =
        typeof o.cycleDelta === "number" && Number.isFinite(o.cycleDelta)
          ? Math.trunc(o.cycleDelta)
          : 0
      return { query, learned, cycleDelta }
    } catch {
      return { query: trimmed, learned: [], cycleDelta: 0 }
    }
  }
  return { query: trimmed, learned: [], cycleDelta: 0 }
}

export function serializeNavJumpQueryPayload(
  query: string,
  learned: readonly string[],
  cycleDelta = 0
): string {
  return JSON.stringify({
    query,
    learned: [...learned],
    cycleDelta
  })
}
