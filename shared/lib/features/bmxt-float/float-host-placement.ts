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

/**
 * EN: Prefer current corner when clear; else preference order; else least overlap.
 * JA: 重ならなければ現在隅を維持。だめなら優先順。全滅なら重なり最小。
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
