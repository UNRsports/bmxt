import { parseAppearanceResetConfirmAnswer } from "../setting/parse-appearance-reset-confirm"

export type NavConfirmCloseTarget = "tab" | "window"

export type NavConfirmClosePending = {
  target: NavConfirmCloseTarget
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
