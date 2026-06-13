import { parseAppearanceResetConfirmAnswer } from "./parse-appearance-reset-confirm"
import { parseHexColor } from "./validate-color"
import { parseFontFamily } from "./validate-font"

export type SettingPromptPending =
  | { kind: "reset-confirm" }
  | { kind: "edit-fg" }
  | { kind: "edit-bg-color" }
  | { kind: "edit-font" }

export type SettingPromptAnswer =
  | { ok: true; kind: "reset-confirm"; answer: "yes" | "no" }
  | { ok: true; kind: "edit-fg"; value: string }
  | { ok: true; kind: "edit-bg-color"; value: string }
  | { ok: true; kind: "edit-font"; value: string }
  | { ok: false; invalid: true }
  | { ok: false; cancelled: true }

export function parseSettingPromptAnswer(
  pending: SettingPromptPending,
  trimmed: string
): SettingPromptAnswer {
  if (trimmed.trim().length === 0) {
    return { ok: false, cancelled: true }
  }
  if (pending.kind === "reset-confirm") {
    const answer = parseAppearanceResetConfirmAnswer(trimmed)
    if (answer === "invalid") {
      return { ok: false, invalid: true }
    }
    return { ok: true, kind: "reset-confirm", answer }
  }
  if (pending.kind === "edit-fg") {
    const value = parseHexColor(trimmed)
    if (!value) {
      return { ok: false, invalid: true }
    }
    return { ok: true, kind: "edit-fg", value }
  }
  if (pending.kind === "edit-bg-color") {
    const value = parseHexColor(trimmed)
    if (!value) {
      return { ok: false, invalid: true }
    }
    return { ok: true, kind: "edit-bg-color", value }
  }
  const value = parseFontFamily(trimmed)
  if (!value) {
    return { ok: false, invalid: true }
  }
  return { ok: true, kind: "edit-font", value }
}
