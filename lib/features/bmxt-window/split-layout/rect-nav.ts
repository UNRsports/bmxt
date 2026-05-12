import type { SplitNode } from "./types"
import { isLeaf } from "./tree"

export type RectDir = "up" | "down" | "left" | "right"

type BBox = { x: number; y: number; w: number; h: number }

function mergeInto(
  target: Map<string, BBox>,
  src: Map<string, BBox>
): void {
  for (const [k, v] of src) {
    target.set(k, v)
  }
}

/** 各リーフの正規化座標 (0–1) のバウンディングボックス。 */
export function leafBoundingBoxes(
  node: SplitNode,
  x: number,
  y: number,
  w: number,
  h: number
): Map<string, BBox> {
  const m = new Map<string, BBox>()
  if (isLeaf(node)) {
    m.set(node.id, { x, y, w, h })
    return m
  }
  const r = Math.min(0.95, Math.max(0.05, node.ratio))
  if (node.kind === "col") {
    const w1 = w * r
    const w2 = w - w1
    mergeInto(m, leafBoundingBoxes(node.a, x, y, w1, h))
    mergeInto(m, leafBoundingBoxes(node.b, x + w1, y, w2, h))
  } else {
    const h1 = h * r
    const h2 = h - h1
    mergeInto(m, leafBoundingBoxes(node.a, x, y, w, h1))
    mergeInto(m, leafBoundingBoxes(node.b, x, y + h1, w, h2))
  }
  return m
}

const EPS = 1e-5

/**
 * 矩形隣接でフォーカス移動先のリーフ ID を返す（Ctrl+矢印用）。
 */
export function adjacentLeafByRect(
  root: SplitNode,
  fromId: string,
  dir: RectDir
): string | null {
  const boxes = leafBoundingBoxes(root, 0, 0, 1, 1)
  const R = boxes.get(fromId)
  if (!R) {
    return null
  }
  let best: { id: string; d: number } | null = null
  for (const [id, B] of boxes) {
    if (id === fromId) {
      continue
    }
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
      if (best === null || d < best.d - EPS || (Math.abs(d - best.d) < EPS && id < best.id)) {
        best = { id, d }
      }
    }
  }
  return best?.id ?? null
}
