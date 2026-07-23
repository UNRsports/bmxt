import {
  parseTabsPageActiveModeToken,
  type TabsPageActiveMode
} from "./page-active-setting"

export type TabsSettingCommandParse =
  | { kind: "incomplete" }
  | { kind: "setting-incomplete" }
  | { kind: "page-active-incomplete" }
  | { kind: "page-active"; mode: TabsPageActiveMode }
  | null

/** EN: `tab -setting -page-active [--auto|--manual]` | lone `tab`. */
export function parseTabsSettingCommandLine(trimmed: string): TabsSettingCommandParse {
  const parts = trimmed.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0 || parts[0]!.toLowerCase() !== "tab") {
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
    const mode = parseTabsPageActiveModeToken(parts[3]!)
    if (mode !== null) {
      return { kind: "page-active", mode }
    }
    return null
  }
  return null
}
