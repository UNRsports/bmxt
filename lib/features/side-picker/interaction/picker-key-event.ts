/** EN: Shared keyboard guards for side-column pickers. */
/** JA: サイド列ピッカー共通のキーイベント判定。 */

export type PickerKeyEvent = Pick<
  KeyboardEvent,
  "key" | "code" | "ctrlKey" | "metaKey" | "altKey" | "shiftKey"
> & { isComposing?: boolean }

export function pickerEventIsComposing(e: PickerKeyEvent): boolean {
  return Boolean(e.isComposing)
}

export function pickerEnterKey(e: PickerKeyEvent): boolean {
  return e.key === "Enter" && !e.shiftKey && !pickerEventIsComposing(e)
}

export function pickerModifierChord(
  e: PickerKeyEvent
): { ctrl: boolean; meta: boolean; alt: boolean; shift: boolean } {
  return {
    ctrl: e.ctrlKey,
    meta: e.metaKey,
    alt: e.altKey,
    shift: e.shiftKey
  }
}

export function pickerPlainTypingKey(e: PickerKeyEvent): boolean {
  const { ctrl, meta, alt } = pickerModifierChord(e)
  return e.key.length === 1 && !ctrl && !meta && !alt
}

export function pickerOpenSearchChord(e: PickerKeyEvent): boolean {
  const { ctrl, meta, alt } = pickerModifierChord(e)
  return e.key === "/" && !ctrl && !meta && !alt
}

export function pickerOpenCommandChord(e: PickerKeyEvent): boolean {
  const { ctrl, meta, alt } = pickerModifierChord(e)
  return e.key === ":" && !ctrl && !meta && !alt
}

export function pickerStopEvent(e: KeyboardEvent): void {
  e.preventDefault()
  e.stopPropagation()
}
