/** EN: Parse `setting -list [--picker]`. */

export type SettingListLineOptions = {
  picker: boolean
}

function normalizeToken(token: string): string {
  return token.trim().toLowerCase()
}

export function parseSettingListLine(trimmed: string): SettingListLineOptions | null {
  const parts = trimmed.trim().split(/\s+/).filter((part) => part.length > 0)
  if (parts.length < 2) {
    return null
  }
  if (normalizeToken(parts[0]!) !== "setting") {
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

/** EN: `setting -list --picker` — open settings picker UI. */
export function parseSettingListPickerLine(trimmed: string): boolean {
  const parsed = parseSettingListLine(trimmed)
  return parsed !== null && parsed.picker
}
