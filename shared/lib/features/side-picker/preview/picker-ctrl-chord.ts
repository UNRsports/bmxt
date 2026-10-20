/** EN: Ctrl without Alt/Meta/Shift (picker open-tab jump chord). */
export function isPickerCtrlOnlyChord(
  e: Pick<KeyboardEvent, "ctrlKey" | "metaKey" | "altKey" | "shiftKey">
): boolean {
  return e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey
}

/** EN: Ctrl combined with other modifiers — not an open-tab jump chord. */
export function isPickerCtrlBlockedChord(
  e: Pick<KeyboardEvent, "ctrlKey" | "metaKey" | "altKey" | "shiftKey">
): boolean {
  return e.ctrlKey && !isPickerCtrlOnlyChord(e)
}
