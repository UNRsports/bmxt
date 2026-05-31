import { pairIdFromSettingToken, type TranslationPairId } from "./translation-pair"

export type TranslateCommandParse =
  | { kind: "on" }
  | { kind: "off" }
  | { kind: "setting"; pair: TranslationPairId }
  | { kind: "setting-incomplete" }
  | { kind: "incomplete" }
  | null

/** EN: `translate -on` | `-off` | `-setting [--ja-en|--en-ja]` | lone `translate`. */
export function parseTranslateCommandLine(trimmed: string): TranslateCommandParse {
  const parts = trimmed.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0 || parts[0]!.toLowerCase() !== "translate") {
    return null
  }
  if (parts.length === 1) {
    return { kind: "incomplete" }
  }
  const second = parts[1]!.toLowerCase()
  if (second === "-on") {
    if (parts.length === 2) {
      return { kind: "on" }
    }
    return null
  }
  if (second === "-off") {
    if (parts.length === 2) {
      return { kind: "off" }
    }
    return null
  }
  if (second === "-setting") {
    if (parts.length === 2) {
      return { kind: "setting-incomplete" }
    }
    if (parts.length === 3) {
      const pair = pairIdFromSettingToken(parts[2]!)
      if (pair !== null) {
        return { kind: "setting", pair }
      }
    }
    return null
  }
  return null
}
