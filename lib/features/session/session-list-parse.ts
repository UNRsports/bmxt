/** EN: Parse `session -list`. */

export type SessionListLineOptions = Record<string, never>

function normalizeToken(token: string): string {
  return token.trim().toLowerCase()
}

export function parseSessionListLine(trimmed: string): SessionListLineOptions | null {
  const parts = trimmed.trim().split(/\s+/).filter((part) => part.length > 0)
  if (parts.length !== 2) {
    return null
  }
  if (normalizeToken(parts[0]!) !== "session") {
    return null
  }
  if (normalizeToken(parts[1]!) !== "-list") {
    return null
  }

  return {}
}
