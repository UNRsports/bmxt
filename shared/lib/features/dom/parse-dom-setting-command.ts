import {
  parseDomPageActiveModeToken,
  type DomPageActiveMode
} from "./page-active-setting.ts"

export type DomSettingCommandParse =
  | { kind: "incomplete" }
  | { kind: "setting-incomplete" }
  | { kind: "page-active-incomplete" }
  | { kind: "page-active"; mode: DomPageActiveMode }
  | null

/** EN: `dom -setting -page-active [--auto|--manual]` | lone `dom`. */
export function parseDomSettingCommandLine(trimmed: string): DomSettingCommandParse {
  const parts = trimmed.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0 || parts[0]!.toLowerCase() !== "dom") {
    return null
  }
  if (parts.length === 1) {
    return { kind: "incomplete" }
  }
  const second = parts[1]!.toLowerCase()
  if (second !== "-setting") {
    return null
  }
  if (parts.length === 2) {
    return { kind: "setting-incomplete" }
  }
  if (parts.length === 3) {
    if (parts[2]!.toLowerCase() === "-page-active") {
      return { kind: "page-active-incomplete" }
    }
    return null
  }
  if (parts.length === 4) {
    if (parts[2]!.toLowerCase() !== "-page-active") {
      return null
    }
    const mode = parseDomPageActiveModeToken(parts[3]!)
    if (mode !== null) {
      return { kind: "page-active", mode }
    }
    return null
  }
  return null
}
