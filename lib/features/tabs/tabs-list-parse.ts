/** EN: Parse `tab -list` line tokens without Chrome / completion dependencies. */

export type TabsListLineOptions = {
  showUrl: boolean
}

function normalizeToken(token: string): string {
  return token.trim().toLowerCase()
}

/**
 * EN: Parse `tab -list [-url]` — full line must match (no extra args).
 * JA: 第三トークン以降は `-url` のみ。
 */
export function parseTabsListLine(trimmed: string): TabsListLineOptions | null {
  const parts = trimmed.trim().split(/\s+/).filter((part) => part.length > 0)
  if (parts.length < 2) {
    return null
  }
  if (normalizeToken(parts[0]!) !== "tab") {
    return null
  }
  if (normalizeToken(parts[1]!) !== "-list") {
    return null
  }

  let showUrl = false
  for (let index = 2; index < parts.length; index += 1) {
    const token = normalizeToken(parts[index]!)
    if (token === "-url") {
      showUrl = true
      continue
    }
    return null
  }

  return { showUrl }
}
