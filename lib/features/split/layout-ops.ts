import type { LayoutNode, SplitDir } from "./types"

function collectIds(n: LayoutNode, out: Set<string>): void {
  if (n.type === "leaf") {
    out.add(n.paneId)
    return
  }
  collectIds(n.a, out)
  collectIds(n.b, out)
}

export function allPaneIds(root: LayoutNode): string[] {
  const s = new Set<string>()
  collectIds(root, s)
  return [...s]
}

function replaceLeafWithSplit(
  n: LayoutNode,
  targetPaneId: string,
  split: LayoutNode
): { ok: boolean; node: LayoutNode } {
  if (n.type === "leaf") {
    if (n.paneId === targetPaneId) {
      return { ok: true, node: split }
    }
    return { ok: false, node: n }
  }
  const ra = replaceLeafWithSplit(n.a, targetPaneId, split)
  if (ra.ok) {
    return { ok: true, node: { ...n, a: ra.node } }
  }
  const rb = replaceLeafWithSplit(n.b, targetPaneId, split)
  if (rb.ok) {
    return { ok: true, node: { ...n, b: rb.node } }
  }
  return { ok: false, node: n }
}

/**
 * 対象 leaf を `dir` で分割する。既存ペインは第1子（上/左）、新規は第2子（下/右）。
 */
export function splitLeaf(
  root: LayoutNode,
  targetPaneId: string,
  dir: SplitDir,
  newPaneId: string
): LayoutNode | null {
  const split: LayoutNode = {
    type: "split",
    dir,
    ratio: 0.5,
    a: { type: "leaf", paneId: targetPaneId },
    b: { type: "leaf", paneId: newPaneId }
  }
  const r = replaceLeafWithSplit(root, targetPaneId, split)
  return r.ok ? r.node : null
}

export function removePane(root: LayoutNode, paneId: string): LayoutNode | null {
  if (root.type === "leaf") {
    return root.paneId === paneId ? null : root
  }
  const a = removePane(root.a, paneId)
  const b = removePane(root.b, paneId)
  if (a === null && b === null) {
    return null
  }
  if (a === null) {
    return b
  }
  if (b === null) {
    return a
  }
  return { ...root, a, b }
}
