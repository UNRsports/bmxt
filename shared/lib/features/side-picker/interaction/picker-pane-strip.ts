import { tryNavigatePaneStrip } from "../panel/pane-focus-nav"

/** EN: Ctrl+←/→ along terminal ↔ open picker columns (focused leaf only). */
export function runPickerPaneStripKeydown(e: KeyboardEvent, sessionId: string): boolean {
  if (!e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) {
    return false
  }
  const horiz =
    e.key === "ArrowLeft" || e.code === "ArrowLeft"
      ? "left"
      : e.key === "ArrowRight" || e.code === "ArrowRight"
        ? "right"
        : null
  if (!horiz || !tryNavigatePaneStrip(sessionId, horiz)) {
    return false
  }
  e.preventDefault()
  e.stopImmediatePropagation()
  return true
}
