/**
 * EN: Spatial adjacency among viewport rectangles (arrow-key snap, not DOM tree order).
 * JA: 矩形位置に基づく隣接移動（DOM 順ではない）。
 */

export type SpatialRect = { x: number; y: number; w: number; h: number }

export type SpatialRectDir = "up" | "down" | "left" | "right"

const EPS = 1e-5

/**
 * EN: Index of the nearest candidate in `dir` from `fromIndex` (pane `rect-nav.ts` algorithm).
 * JA: 方向 `dir` で overlap かつ最短距離の候補 index。見つからなければ null。
 */
export function adjacentCandidateIndexByRect(
  boxes: readonly SpatialRect[],
  fromIndex: number,
  dir: SpatialRectDir
): number | null {
  if (fromIndex < 0 || fromIndex >= boxes.length) {
    return null
  }
  const R = boxes[fromIndex]!
  let best: { index: number; d: number } | null = null
  for (let i = 0; i < boxes.length; i += 1) {
    if (i === fromIndex) {
      continue
    }
    const B = boxes[i]!
    let ok = false
    let d = Number.POSITIVE_INFINITY
    if (dir === "right") {
      if (B.x >= R.x + R.w - EPS) {
        const overlap = Math.min(R.y + R.h, B.y + B.h) - Math.max(R.y, B.y)
        if (overlap > EPS) {
          ok = true
          d = B.x - (R.x + R.w)
        }
      }
    } else if (dir === "left") {
      if (B.x + B.w <= R.x + EPS) {
        const overlap = Math.min(R.y + R.h, B.y + B.h) - Math.max(R.y, B.y)
        if (overlap > EPS) {
          ok = true
          d = R.x - (B.x + B.w)
        }
      }
    } else if (dir === "down") {
      if (B.y >= R.y + R.h - EPS) {
        const overlap = Math.min(R.x + R.w, B.x + B.w) - Math.max(R.x, B.x)
        if (overlap > EPS) {
          ok = true
          d = B.y - (R.y + R.h)
        }
      }
    } else if (dir === "up") {
      if (B.y + B.h <= R.y + EPS) {
        const overlap = Math.min(R.x + R.w, B.x + B.w) - Math.max(R.x, B.x)
        if (overlap > EPS) {
          ok = true
          d = R.y - (B.y + B.h)
        }
      }
    }
    if (ok) {
      if (best === null || d < best.d - EPS || (Math.abs(d - best.d) < EPS && i < best.index)) {
        best = { index: i, d }
      }
    }
  }
  return best?.index ?? null
}

/** EN: Pick the candidate whose box center is closest to `(px, py)`. */
export function nearestCandidateIndexByPoint(
  boxes: readonly SpatialRect[],
  px: number,
  py: number
): number {
  if (boxes.length === 0) {
    return -1
  }
  let bestIndex = 0
  let bestDist = Number.POSITIVE_INFINITY
  for (let i = 0; i < boxes.length; i += 1) {
    const b = boxes[i]!
    const cx = b.x + b.w / 2
    const cy = b.y + b.h / 2
    const dist = (cx - px) ** 2 + (cy - py) ** 2
    if (dist < bestDist - EPS || (Math.abs(dist - bestDist) < EPS && i < bestIndex)) {
      bestDist = dist
      bestIndex = i
    }
  }
  return bestIndex
}

export function spatialDirFromDelta(dx: number, dy: number): SpatialRectDir | null {
  if (dx === 0 && dy === 0) {
    return null
  }
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx < 0 ? "left" : dx > 0 ? "right" : null
  }
  return dy < 0 ? "up" : dy > 0 ? "down" : null
}

export function pathsEqual(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) {
    return false
  }
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) {
      return false
    }
  }
  return true
}

export function findCandidateIndexByPath(
  paths: readonly (readonly number[])[],
  path: readonly number[] | null
): number {
  if (path == null) {
    return -1
  }
  for (let i = 0; i < paths.length; i += 1) {
    if (pathsEqual(paths[i]!, path)) {
      return i
    }
  }
  return -1
}
