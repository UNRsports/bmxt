/** EN: Parse `bookmark -list [--folder <id>] [--device <id>|--peers]`. */

import {
  parseDeviceListScopeTokens,
  type DeviceListScope
} from "../sync/bus/device-list-scope.ts"

export type BookmarkListLineOptions = {
  folderId: string | null
  scope: DeviceListScope
}

const MAX_FOLDER = 64

function normalizeToken(token: string): string {
  return token.trim().toLowerCase()
}

function sanitizeFolderId(raw: string): string | null {
  const trimmed = raw.trim()
  if (trimmed.length === 0 || trimmed.length > MAX_FOLDER) {
    return null
  }
  if (![...trimmed].every((c) => /[A-Za-z0-9_-]/.test(c))) {
    return null
  }
  return trimmed
}

/**
 * EN: Parse `bookmark -list` full line. Peers/device scopes are accepted for match
 * but the tree list producer refuses them (search path remains for cross-device).
 */
export function parseBookmarkListLine(trimmed: string): BookmarkListLineOptions | null {
  const parts = trimmed.trim().split(/\s+/).filter((part) => part.length > 0)
  if (parts.length < 2) {
    return null
  }
  if (normalizeToken(parts[0]!) !== "bookmark") {
    return null
  }
  if (normalizeToken(parts[1]!) !== "-list") {
    return null
  }

  const scoped = parseDeviceListScopeTokens(parts.slice(2))
  if (!scoped.ok) {
    return null
  }

  let folderId: string | null = null
  let i = 0
  const rest = scoped.rest
  while (i < rest.length) {
    if (normalizeToken(rest[i]!) === "--folder") {
      const next = rest[i + 1]
      if (next === undefined) {
        return null
      }
      const id = sanitizeFolderId(next)
      if (id === null) {
        return null
      }
      folderId = id
      i += 2
      continue
    }
    return null
  }

  return { folderId, scope: scoped.scope }
}
