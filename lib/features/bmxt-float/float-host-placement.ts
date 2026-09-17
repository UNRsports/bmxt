/**
 * EN: Corner slots + overlap math for in-page float host auto-avoidance.
 * JA: サイト上フロートの四隅スロットと重なり判定（nav 等からの自動退避用）。
 */

export type FloatCorner = "bottom-right" | "bottom-left" | "top-right" | "top-left"

export type FloatRect = {
  left: number
  top: number
  width: number
  height: number
}

export const FLOAT_DEFAULT_CORNER: FloatCorner = "bottom-right"

export const FLOAT_CORNER_PREFERENCE: readonly FloatCorner[] = [
  "bottom-right",
  "bottom-left",
  "top-right",
  "top-left"
]

export const FLOAT_VIEWPORT_MARGIN_PX = 16
export const FLOAT_OBSTACLE_PAD_PX = 28
/** EN: How much of the float stays visible when hanging off-screen during nav avoid. */
export const FLOAT_OVERHANG_PEEK_PX = 40

export function inflateRect(rect: FloatRect, pad: number): FloatRect {
  return {
    left: rect.left - pad,
    top: rect.top - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2
  }
}

export function rectsOverlap(a: FloatRect, b: FloatRect): boolean {
  if (a.width <= 0 || a.height <= 0 || b.width <= 0 || b.height <= 0) {
    return false
  }
  const aRight = a.left + a.width
  const aBottom = a.top + a.height
  const bRight = b.left + b.width
  const bBottom = b.top + b.height
  return a.left < bRight && aRight > b.left && a.top < bBottom && aBottom > b.top
}

export function overlapArea(a: FloatRect, b: FloatRect): number {
  const left = Math.max(a.left, b.left)
  const top = Math.max(a.top, b.top)
  const right = Math.min(a.left + a.width, b.left + b.width)
  const bottom = Math.min(a.top + a.height, b.top + b.height)
  const w = right - left
  const h = bottom - top
  if (w <= 0 || h <= 0) {
    return 0
  }
  return w * h
}

export function cornerToRect(
  corner: FloatCorner,
  viewportWidth: number,
  viewportHeight: number,
  floatWidth: number,
  floatHeight: number,
  margin: number = FLOAT_VIEWPORT_MARGIN_PX
): FloatRect {
  const maxLeft = Math.max(margin, viewportWidth - floatWidth - margin)
  const maxTop = Math.max(margin, viewportHeight - floatHeight - margin)
  const left =
    corner === "bottom-left" || corner === "top-left" ? margin : maxLeft
  const top =
    corner === "top-left" || corner === "top-right" ? margin : maxTop
  return {
    left,
    top,
    width: floatWidth,
    height: floatHeight
  }
}

export function totalOverlapWithObstacles(
  candidate: FloatRect,
  obstacles: readonly FloatRect[]
): number {
  let total = 0
  for (const obstacle of obstacles) {
    total += overlapArea(candidate, obstacle)
  }
  return total
}

export function floatOverlapsAnyObstacle(
  rect: FloatRect,
  obstacles: readonly FloatRect[]
): boolean {
  for (const obstacle of obstacles) {
    if (rectsOverlap(rect, obstacle)) {
      return true
    }
  }
  return false
}

export type FloatOverhangEdge = "left" | "right" | "top" | "bottom"

/**
 * EN: Hang the float mostly outside the viewport (peek strip remains) to clear obstacles.
 *     Size is unchanged. Prefers the edge with the least travel from `home`.
 * JA: 障害を避けるためフロートをビューポート外へはみ出させる（覗き分は残す）。サイズ不変。
 */
export function computeOverhangRect(args: {
  home: FloatRect
  viewportWidth: number
  viewportHeight: number
  obstacles: readonly FloatRect[]
  peekPx?: number
}): FloatRect {
  const peek = args.peekPx ?? FLOAT_OVERHANG_PEEK_PX
  const { home, viewportWidth, viewportHeight, obstacles } = args
  const candidates: { edge: FloatOverhangEdge; rect: FloatRect; travel: number }[] = [
    {
      edge: "left",
      rect: { ...home, left: peek - home.width },
      travel: Math.abs(home.left - (peek - home.width))
    },
    {
      edge: "right",
      rect: { ...home, left: viewportWidth - peek },
      travel: Math.abs(home.left - (viewportWidth - peek))
    },
    {
      edge: "top",
      rect: { ...home, top: peek - home.height },
      travel: Math.abs(home.top - (peek - home.height))
    },
    {
      edge: "bottom",
      rect: { ...home, top: viewportHeight - peek },
      travel: Math.abs(home.top - (viewportHeight - peek))
    }
  ]

  let best = candidates[0]!
  let bestOverlap = totalOverlapWithObstacles(best.rect, obstacles)

  for (const candidate of candidates) {
    const overlap = totalOverlapWithObstacles(candidate.rect, obstacles)
    if (overlap < bestOverlap) {
      best = candidate
      bestOverlap = overlap
      continue
    }
    if (overlap === bestOverlap && candidate.travel < best.travel) {
      best = candidate
      bestOverlap = overlap
    }
  }

  return best.rect
}

/**
 * EN: Prefer current corner when clear; else preference order; else least overlap.
 * JA: 重ならなければ現在隅を維持。だめなら優先順。全滅なら重なり最小。
 * @deprecated Prefer overhang avoidance (`computeOverhangRect`) for nav.
 */
export function pickFloatCorner(args: {
  current: FloatCorner
  viewportWidth: number
  viewportHeight: number
  floatWidth: number
  floatHeight: number
  obstacles: readonly FloatRect[]
  margin?: number
}): FloatCorner {
  const margin = args.margin ?? FLOAT_VIEWPORT_MARGIN_PX
  const ordered: FloatCorner[] = [args.current]
  for (const corner of FLOAT_CORNER_PREFERENCE) {
    if (!ordered.includes(corner)) {
      ordered.push(corner)
    }
  }

  let bestCorner = args.current
  let bestOverlap = Number.POSITIVE_INFINITY

  for (const corner of ordered) {
    const rect = cornerToRect(
      corner,
      args.viewportWidth,
      args.viewportHeight,
      args.floatWidth,
      args.floatHeight,
      margin
    )
    const overlap = totalOverlapWithObstacles(rect, args.obstacles)
    if (overlap === 0) {
      return corner
    }
    if (overlap < bestOverlap) {
      bestOverlap = overlap
      bestCorner = corner
    }
  }

  return bestCorner
}
