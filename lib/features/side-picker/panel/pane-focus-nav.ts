/** EN: Horizontal focus chain within one session leaf: terminal → open picker slots. */
/** JA: 1 セッション内の横フォーカス列（ターミナル → 開いているピッカー列）。 */

import type { PickerSlotId } from "../session/session-pickers"

export type PaneFocusTarget = "terminal" | PickerSlotId

export type PaneStripOpen = PickerSlotId

export type PaneStripSnapshot = {
  open: readonly PaneStripOpen[]
  focus: PaneFocusTarget
  isFocusedLeaf: boolean
}

export type PaneStripActions = {
  setFocus: (next: PaneFocusTarget) => void
  focusTerminal: () => void
  focusPicker: (slot: PickerSlotId) => void
}

type PaneStripEntry = {
  getSnapshot: () => PaneStripSnapshot
  actions: PaneStripActions
}

const strips = new Map<string, PaneStripEntry>()

export function registerPaneStrip(
  sessionId: string,
  getSnapshot: () => PaneStripSnapshot,
  actions: PaneStripActions
): () => void {
  strips.set(sessionId, { getSnapshot, actions })
  return () => {
    strips.delete(sessionId)
  }
}

export function focusChain(open: readonly PaneStripOpen[]): PaneFocusTarget[] {
  return ["terminal", ...open]
}

function applyFocus(actions: PaneStripActions, target: PaneFocusTarget): void {
  actions.setFocus(target)
  if (target === "terminal") {
    actions.focusTerminal()
  } else {
    actions.focusPicker(target)
  }
}

export function paneStripHorizAtEdge(
  open: readonly PaneStripOpen[],
  focus: PaneFocusTarget,
  dir: "left" | "right"
): boolean {
  const chain = focusChain(open)
  if (chain.length <= 1) {
    return true
  }
  const idx = chain.indexOf(focus)
  if (idx < 0) {
    return true
  }
  return dir === "left" ? idx <= 0 : idx >= chain.length - 1
}

/** EN: Move focus along terminal ↔ pickers; returns true if handled. */
export function navigatePaneStripHoriz(
  open: readonly PaneStripOpen[],
  focus: PaneFocusTarget,
  dir: "left" | "right",
  actions: PaneStripActions
): boolean {
  const chain = focusChain(open)
  if (chain.length <= 1) {
    return false
  }
  const idx = chain.indexOf(focus)
  if (idx < 0) {
    return false
  }
  const nextIdx = dir === "left" ? idx - 1 : idx + 1
  if (nextIdx < 0 || nextIdx >= chain.length) {
    return false
  }
  applyFocus(actions, chain[nextIdx]!)
  return true
}

function getEntry(sessionId: string): PaneStripEntry | undefined {
  return strips.get(sessionId)
}

/** EN: Move focus using live snapshot from registration (for split-tree handler). */
export function tryNavigatePaneStrip(
  sessionId: string,
  dir: "left" | "right"
): boolean {
  const entry = getEntry(sessionId)
  if (!entry) {
    return false
  }
  const snap = entry.getSnapshot()
  if (!snap.isFocusedLeaf) {
    return false
  }
  return navigatePaneStripHoriz(snap.open, snap.focus, dir, entry.actions)
}

/** EN: True when strip navigation cannot move further in `dir` (fall through to split rect-nav). */
export function paneStripAtHorizontalEdge(
  sessionId: string,
  dir: "left" | "right"
): boolean {
  const entry = getEntry(sessionId)
  if (!entry) {
    return true
  }
  const snap = entry.getSnapshot()
  if (!snap.isFocusedLeaf) {
    return true
  }
  return paneStripHorizAtEdge(snap.open, snap.focus, dir)
}
