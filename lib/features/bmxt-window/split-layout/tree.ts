import type { SplitLayoutV1, SplitLeaf, SplitNode } from "./types"

const RATIO_MIN = 0.05
const RATIO_MAX = 0.95

function clampRatio(r: number): number {
  return Math.min(RATIO_MAX, Math.max(RATIO_MIN, r))
}

export function isLeaf(n: SplitNode): n is SplitLeaf {
  return n.kind === "leaf"
}

export function listLeafIds(root: SplitNode): string[] {
  if (isLeaf(root)) {
    return [root.id]
  }
  return [...listLeafIds(root.a), ...listLeafIds(root.b)]
}

export function countLeaves(root: SplitNode): number {
  return listLeafIds(root).length
}

export function containsLeaf(root: SplitNode, id: string): boolean {
  return listLeafIds(root).includes(id)
}

/** 左から順に col で連結（旧タブ order の移行用）。 */
export function colChainFromLeafIds(ids: string[]): SplitNode {
  if (ids.length === 0) {
    throw new Error("colChainFromLeafIds: empty")
  }
  if (ids.length === 1) {
    return { kind: "leaf", id: ids[0] }
  }
  const [first, ...rest] = ids
  return {
    kind: "col",
    ratio: 0.5,
    a: { kind: "leaf", id: first },
    b: colChainFromLeafIds(rest)
  }
}

function mapNode(node: SplitNode, leafId: string, fn: (n: SplitLeaf) => SplitNode): SplitNode {
  if (isLeaf(node)) {
    return node.id === leafId ? fn(node) : node
  }
  return {
    ...node,
    a: mapNode(node.a, leafId, fn),
    b: mapNode(node.b, leafId, fn)
  }
}

export function splitColAtLeaf(root: SplitNode, leafId: string, newLeafId: string): SplitNode {
  return mapNode(root, leafId, () => ({
    kind: "col",
    ratio: 0.5,
    a: { kind: "leaf", id: leafId },
    b: { kind: "leaf", id: newLeafId }
  }))
}

export function splitRowAtLeaf(root: SplitNode, leafId: string, newLeafId: string): SplitNode {
  return mapNode(root, leafId, () => ({
    kind: "row",
    ratio: 0.5,
    a: { kind: "leaf", id: leafId },
    b: { kind: "leaf", id: newLeafId }
  }))
}

function removeLeafInner(node: SplitNode, leafId: string): SplitNode | null {
  if (isLeaf(node)) {
    if (node.id === leafId) {
      return null
    }
    return node
  }
  const a2 = removeLeafInner(node.a, leafId)
  const b2 = removeLeafInner(node.b, leafId)
  if (a2 === null) {
    return b2
  }
  if (b2 === null) {
    return a2
  }
  return { ...node, a: a2, b: b2, ratio: clampRatio(node.ratio) }
}

export function removeLeafFromTree(
  root: SplitNode,
  leafId: string
): { root: SplitNode | null; focusHint: string | null } {
  const before = listLeafIds(root)
  if (!before.includes(leafId) || before.length <= 1) {
    return { root, focusHint: null }
  }
  const nextRoot = removeLeafInner(root, leafId)
  if (nextRoot === null) {
    return { root: null, focusHint: null }
  }
  const after = listLeafIds(nextRoot)
  return { root: nextRoot, focusHint: after[0] ?? null }
}

export function ensureFocusedInTree(layout: SplitLayoutV1): SplitLayoutV1 {
  const ids = listLeafIds(layout.root)
  if (ids.includes(layout.focusedLeafId)) {
    return layout
  }
  return { ...layout, focusedLeafId: ids[0] ?? layout.focusedLeafId }
}

export function singleLeafLayout(leafId: string): SplitLayoutV1 {
  return {
    v: 1,
    root: { kind: "leaf", id: leafId },
    focusedLeafId: leafId
  }
}

export function isValidLayout(x: unknown): x is SplitLayoutV1 {
  if (!x || typeof x !== "object") {
    return false
  }
  const o = x as SplitLayoutV1
  if (o.v !== 1 || typeof o.focusedLeafId !== "string") {
    return false
  }
  try {
    const ids = listLeafIds(o.root)
    return ids.length > 0 && ids.includes(o.focusedLeafId)
  } catch {
    return false
  }
}
