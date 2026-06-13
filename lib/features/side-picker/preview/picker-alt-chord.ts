/** EN: Alt without Ctrl/Meta/Shift (picker preview chord). */
export function isPickerAltOnlyChord(
  e: Pick<KeyboardEvent, "altKey" | "ctrlKey" | "metaKey" | "shiftKey">
): boolean {
  return e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey
}

/** EN: Alt combined with other modifiers — not a preview chord. */
export function isPickerAltBlockedChord(
  e: Pick<KeyboardEvent, "altKey" | "ctrlKey" | "metaKey" | "shiftKey">
): boolean {
  return e.altKey && !isPickerAltOnlyChord(e)
}
