/** EN: Parse `tabs -list` line tokens without Chrome / completion dependencies. */

export type TabsListLineOptions = {
  showUrl: boolean
  picker: boolean
}

function normalizeToken(token: string): string {
  return token.trim().toLowerCase()
}

/**
 * EN: Parse `tabs -list [-u] [--picker]` — full line must match (no extra args).
 * JA: 第三トークン以降は `-u` と `--picker` のみ。
 */
export function parseTabsListLine(trimmed: string): TabsListLineOptions | null {
  const parts = trimmed.trim().split(/\s+/).filter((part) => part.length > 0)
  if (parts.length < 2) {
    return null
  }
  if (normalizeToken(parts[0]!) !== "tabs") {
    return null
  }
  if (normalizeToken(parts[1]!) !== "-list") {
    return null
  }

  let showUrl = false
  let picker = false
  for (let index = 2; index < parts.length; index += 1) {
    const token = normalizeToken(parts[index]!)
    if (token === "-u") {
      showUrl = true
      continue
    }
    if (token === "--picker") {
      picker = true
      continue
    }
    return null
  }

  return { showUrl, picker }
}

/** EN: `tabs -list --picker` (optional `-u`) — opens tab picker UI. */
export function parseTabsListPickerLine(trimmed: string): { showUrl: boolean } | null {
  const parsed = parseTabsListLine(trimmed)
  if (parsed === null || !parsed.picker) {
    return null
  }
  return { showUrl: parsed.showUrl }
}
