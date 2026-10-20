/** EN: ← from picker returns to detail-bar selection when `canExit` is true. */

export function runPickerExitToDetailBar(
  e: KeyboardEvent,
  canExit: () => boolean,
  onExit: () => void
): boolean {
  if (e.key !== "ArrowLeft" && e.code !== "ArrowLeft") {
    return false
  }
  if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) {
    return false
  }
  if (!canExit()) {
    return false
  }
  e.preventDefault()
  e.stopImmediatePropagation()
  onExit()
  return true
}
