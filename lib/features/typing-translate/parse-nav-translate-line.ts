export type NavTranslateParse =
  | { kind: "on" }
  | { kind: "off" }
  | { kind: "incomplete" }
  | null

/** EN: `nav -translate -on` | `-off` | lone `nav -translate` (needs third token). */
export function parseNavTranslateLine(trimmed: string): NavTranslateParse {
  const parts = trimmed.trim().split(/\s+/).filter(Boolean)
  if (parts.length < 2 || parts[0]!.toLowerCase() !== "nav") {
    return null
  }
  if (parts[1]!.toLowerCase() !== "-translate") {
    return null
  }
  if (parts.length === 2) {
    return { kind: "incomplete" }
  }
  const third = parts[2]!.toLowerCase()
  if (third === "-on") {
    return { kind: "on" }
  }
  if (third === "-off") {
    return { kind: "off" }
  }
  return null
}
