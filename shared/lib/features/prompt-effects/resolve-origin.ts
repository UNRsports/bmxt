import type { PromptEffectOrigin } from "./types"

/** EN: Map caret (or fallback estimate) into prompt-field local coordinates. */
export function resolvePromptEffectOrigin(
  field: HTMLElement,
  caret: HTMLElement | null,
  cursorPos: number
): PromptEffectOrigin {
  const fieldRect = field.getBoundingClientRect()
  if (caret) {
    const caretRect = caret.getBoundingClientRect()
    return {
      x: caretRect.left - fieldRect.left + caretRect.width * 0.5,
      y: caretRect.top - fieldRect.top + caretRect.height * 0.75
    }
  }
  return {
    x: Math.min(fieldRect.width - 4, 8 + cursorPos * 7.2),
    y: Math.min(fieldRect.height * 0.75, 16)
  }
}
