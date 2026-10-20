/** EN: Parse `setting -list`. */

export type SettingListLineOptions = Record<string, never>

function normalizeToken(token: string): string {
  return token.trim().toLowerCase()
}

export function parseSettingListLine(trimmed: string): SettingListLineOptions | null {
  const parts = trimmed.trim().split(/\s+/).filter((part) => part.length > 0)
  if (parts.length !== 2) {
    return null
  }
  if (normalizeToken(parts[0]!) !== "setting") {
    return null
  }
  if (normalizeToken(parts[1]!) !== "-list") {
    return null
  }

  return {}
}
