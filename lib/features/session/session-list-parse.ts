/** EN: Parse `session -list [--picker]`. */

export type SessionListLineOptions = {
  picker: boolean
}

function normalizeToken(token: string): string {
  return token.trim().toLowerCase()
}

export function parseSessionListLine(trimmed: string): SessionListLineOptions | null {
  const parts = trimmed.trim().split(/\s+/).filter((part) => part.length > 0)
  if (parts.length < 2) {
    return null
  }
  if (normalizeToken(parts[0]!) !== "session") {
    return null
  }
  if (normalizeToken(parts[1]!) !== "-list") {
    return null
  }

  let picker = false
  for (let index = 2; index < parts.length; index += 1) {
    const token = normalizeToken(parts[index]!)
    if (token === "--picker") {
      picker = true
      continue
    }
    return null
  }

  return { picker }
}

/** EN: `session -list --picker` — open session list picker UI. */
export function parseSessionListPickerLine(trimmed: string): boolean {
  const parsed = parseSessionListLine(trimmed)
  return parsed !== null && parsed.picker
}
