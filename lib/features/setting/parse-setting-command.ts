import {
  buildAppearancePatch,
  parseAppearanceFlagToken,
  type AppearanceFlagToken,
  type UiAppearance
} from "./appearance"
import {
  parseUiLocaleSettingToken,
  type UiLocale
} from "./locale"

export type SettingCommandParse =
  | { kind: "incomplete" }
  | { kind: "language-incomplete" }
  | { kind: "language"; locale: UiLocale }
  | { kind: "appearance-incomplete" }
  | { kind: "appearance-flag-incomplete"; flag: AppearanceFlagToken }
  | { kind: "appearance-value"; flag: AppearanceFlagToken; value: string | null }
  | { kind: "appearance-bg-import" }
  | { kind: "appearance-bg-clear" }
  | { kind: "appearance-reset" }
  | null

const VALUE_FLAGS: ReadonlySet<AppearanceFlagToken> = new Set([
  "--fg",
  "--bg-color",
  "--size",
  "--font"
])

function joinRest(parts: readonly string[], startIndex: number): string {
  return parts.slice(startIndex).join(" ").trim()
}

/** EN: `setting -language [--japanese|--english]` | `setting -appearance …` | lone `setting`. */
export function parseSettingCommandLine(trimmed: string): SettingCommandParse {
  const parts = trimmed.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0 || parts[0]!.toLowerCase() !== "setting") {
    return null
  }
  if (parts.length === 1) {
    return { kind: "incomplete" }
  }
  const second = parts[1]!.toLowerCase()
  if (second === "-language") {
    if (parts.length === 2) {
      return { kind: "language-incomplete" }
    }
    if (parts.length === 3) {
      const locale = parseUiLocaleSettingToken(parts[2]!)
      if (locale !== null) {
        return { kind: "language", locale }
      }
    }
    return null
  }
  if (second === "-appearance") {
    if (parts.length === 2) {
      return { kind: "appearance-incomplete" }
    }
    const flag = parseAppearanceFlagToken(parts[2]!)
    if (flag === null) {
      return null
    }
    if (flag === "--bg-import") {
      if (parts.length === 3) {
        return { kind: "appearance-bg-import" }
      }
      return null
    }
    if (flag === "--bg-clear") {
      if (parts.length === 3) {
        return { kind: "appearance-bg-clear" }
      }
      return null
    }
    if (flag === "--reset") {
      if (parts.length === 3) {
        return { kind: "appearance-reset" }
      }
      return null
    }
    if (VALUE_FLAGS.has(flag)) {
      if (parts.length === 3) {
        return { kind: "appearance-flag-incomplete", flag }
      }
      const value = joinRest(parts, 3)
      if (value.length === 0) {
        return { kind: "appearance-flag-incomplete", flag }
      }
      return { kind: "appearance-value", flag, value }
    }
    return null
  }
  return null
}

export function validateAppearanceCommand(
  flag: AppearanceFlagToken,
  value: string | null
): { ok: true; patch: Partial<UiAppearance> } | { ok: false; error: string } {
  return buildAppearancePatch(flag, value)
}
