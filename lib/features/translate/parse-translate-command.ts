export type TranslateCommandParse =
  | { kind: "on" }
  | { kind: "off" }
  | { kind: "incomplete" }
  | null

/** EN: `translate -on` | `-off` | lone `translate` (needs second token). */
export function parseTranslateCommandLine(trimmed: string): TranslateCommandParse {
  const parts = trimmed.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0 || parts[0]!.toLowerCase() !== "translate") {
    return null
  }
  if (parts.length === 1) {
    return { kind: "incomplete" }
  }
  if (parts.length !== 2) {
    return null
  }
  const second = parts[1]!.toLowerCase()
  if (second === "-on") {
    return { kind: "on" }
  }
  if (second === "-off") {
    return { kind: "off" }
  }
  return null
}
