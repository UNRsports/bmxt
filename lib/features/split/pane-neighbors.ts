import type { LayoutNode } from "./types"

type PathStep = {
  parent: Extract<LayoutNode, { type: "split" }>
  side: "a" | "b"
}

function firstLeaf(n: LayoutNode): string {
  return n.type === "leaf" ? n.paneId : firstLeaf(n.a)
}

function lastLeaf(n: LayoutNode): string {
  return n.type === "leaf" ? n.paneId : lastLeaf(n.b)
}

function findPath(root: LayoutNode, paneId: string): PathStep[] | null {
  if (root.type === "leaf") {
    return root.paneId === paneId ? [] : null
  }
  const left = findPath(root.a, paneId)
  if (left !== null) {
    return [{ parent: root, side: "a" }, ...left]
  }
  const right = findPath(root.b, paneId)
  if (right !== null) {
    return [{ parent: root, side: "b" }, ...right]
  }
  return null
}

export type PaneNavigateDir = "up" | "down" | "left" | "right"

/**
 * 現在ペインから Alt+矢印で移動するときの相手ペイン（なければ null）。
 * row = 上/下、a が上・左、b が下・右。
 */
export function neighborPane(
  root: LayoutNode,
  paneId: string,
  dir: PaneNavigateDir
): string | null {
  const path = findPath(root, paneId)
  if (!path) {
    return null
  }
  for (let i = path.length - 1; i >= 0; i--) {
    const { parent, side } = path[i]!
    if (dir === "down" && parent.dir === "row" && side === "a") {
      return firstLeaf(parent.b)
    }
    if (dir === "up" && parent.dir === "row" && side === "b") {
      return lastLeaf(parent.a)
    }
    if (dir === "right" && parent.dir === "col" && side === "a") {
      return firstLeaf(parent.b)
    }
    if (dir === "left" && parent.dir === "col" && side === "b") {
      return lastLeaf(parent.a)
    }
  }
  return null
}
