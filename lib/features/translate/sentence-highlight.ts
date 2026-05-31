/** EN: Sentence indices from a DOM selection inside a highlight root. */
export function sentenceIndicesFromSelection(root: HTMLElement | null): readonly number[] {
  const sel = window.getSelection()
  if (!root || !sel || sel.rangeCount === 0) {
    return []
  }

  if (sel.isCollapsed) {
    const anchor = sel.anchorNode
    if (!anchor) {
      return []
    }
    const el =
      anchor instanceof Element
        ? anchor.closest("[data-sentence-index]")
        : anchor.parentElement?.closest("[data-sentence-index]")
    if (!el || !root.contains(el)) {
      return []
    }
    const index = Number((el as HTMLElement).dataset.sentenceIndex)
    return Number.isFinite(index) ? [index] : []
  }

  const indices = new Set<number>()
  root.querySelectorAll("[data-sentence-index]").forEach((node) => {
    if (sel.containsNode(node, true)) {
      const index = Number((node as HTMLElement).dataset.sentenceIndex)
      if (Number.isFinite(index)) {
        indices.add(index)
      }
    }
  })
  return [...indices].sort((a, b) => a - b)
}

export function indicesToSet(indices: readonly number[]): ReadonlySet<number> {
  return new Set(indices)
}

export function setsEqual(a: ReadonlySet<number>, b: ReadonlySet<number>): boolean {
  if (a.size !== b.size) {
    return false
  }
  for (const n of a) {
    if (!b.has(n)) {
      return false
    }
  }
  return true
}
