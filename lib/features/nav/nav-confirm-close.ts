import { parseAppearanceResetConfirmAnswer } from "../setting/parse-appearance-reset-confirm.ts"

export type NavConfirmCloseTarget = "tab" | "window"

export type NavConfirmClosePending = {
  target: NavConfirmCloseTarget
  /** EN: Immutable prompt text ending with `:` (Linux-style inline y/n). */
  lockedPrefix: string
}

export function parseNavConfirmCloseTarget(raw: string): NavConfirmCloseTarget | null {
  if (raw === "tab" || raw === "window") {
    return raw
  }
  return null
}

export function parseNavConfirmCloseAnswer(
  trimmed: string
): "yes" | "no" | "invalid" {
  return parseAppearanceResetConfirmAnswer(trimmed)
}

/** EN: Build locked confirm prompt text (`… [y/n]:`). */
export function formatNavConfirmCloseLockedPrefix(question: string): string {
  const base = question.trimEnd()
  if (base.endsWith(":")) {
    return base
  }
  return `${base}:`
}
