export type PickerAltPreviewMode = "auto" | "manual"

/** EN: Whether background preview should run for the current highlight. */
export function shouldRunPickerAltPreview(
  mode: PickerAltPreviewMode,
  altKeyHeld: boolean
): boolean {
  return mode === "auto" || altKeyHeld
}
