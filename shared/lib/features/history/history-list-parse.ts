/** EN: Parse `history -list [pattern…] [--device <id>|--peers]`. */

import {
  parseDeviceListScopeTokens,
  type DeviceListScope
} from "../sync/bus/device-list-scope.ts"

export type HistoryListLineOptions = {
  pattern: string
  scope: DeviceListScope
}

function normalizeToken(token: string): string {
  return token.trim().toLowerCase()
}

/**
 * EN: Parse `history -list` full line. Pattern tokens are free text after flags.
 */
export function parseHistoryListLine(trimmed: string): HistoryListLineOptions | null {
  const parts = trimmed.trim().split(/\s+/).filter((part) => part.length > 0)
  if (parts.length < 2) {
    return null
  }
  if (normalizeToken(parts[0]!) !== "history") {
    return null
  }
  if (normalizeToken(parts[1]!) !== "-list") {
    return null
  }

  const scoped = parseDeviceListScopeTokens(parts.slice(2))
  if (!scoped.ok) {
    return null
  }

  const patternParts: string[] = []
  for (const token of scoped.rest) {
    if (token.startsWith("-")) {
      return null
    }
    patternParts.push(token)
  }

  return {
    pattern: patternParts.join(" "),
    scope: scoped.scope
  }
}
