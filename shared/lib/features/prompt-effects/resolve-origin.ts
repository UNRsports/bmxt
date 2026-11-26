import type { PromptEffectOrigin } from "./types"

/**
 * EN: Map caret (or fallback estimate) into viewport coordinates for a full-window stage.
 * JA: キャレット（なければ推定）をビューポート座標へ写す（全画面ステージ用）。
 */
export function resolvePromptEffectOrigin(
  field: HTMLElement,
  caret: HTMLElement | null,
  cursorPos: number
): PromptEffectOrigin {
  if (caret) {
    const caretRect = caret.getBoundingClientRect()
    return {
      x: caretRect.left + caretRect.width * 0.5,
      y: caretRect.top + caretRect.height * 0.75
    }
  }
  const fieldRect = field.getBoundingClientRect()
  return {
    x: fieldRect.left + Math.min(fieldRect.width - 4, 8 + cursorPos * 7.2),
    y: fieldRect.top + Math.min(fieldRect.height * 0.75, 16)
  }
}
