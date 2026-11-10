/** EN: Parse `tab -list` line tokens without Chrome / completion dependencies. */

import {
  parseDeviceListScopeTokens,
  type DeviceListScope
} from "../sync/bus/device-list-scope.ts"

export type TabsListLineOptions = {
  showUrl: boolean
  scope: DeviceListScope
}

function normalizeToken(token: string): string {
  return token.trim().toLowerCase()
}

/**
 * EN: Parse `tab -list [-url] [--device <id>|--peers]` — full line must match.
 * JA: 第三トークン以降は `-url` / `--device` / `--peers` のみ。
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

  const scoped = parseDeviceListScopeTokens(parts.slice(2))
  if (!scoped.ok) {
    return null
  }

  let showUrl = false
  for (const tokenRaw of scoped.rest) {
    const token = normalizeToken(tokenRaw)
    if (token === "-url") {
      showUrl = true
      continue
    }
    return null
  }

  return { showUrl, scope: scoped.scope }
}
