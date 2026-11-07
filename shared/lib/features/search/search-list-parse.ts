/** EN: Parse `search -list` tokens (scope, pattern, device routing). */

import {
  isSearchListScopeToken,
  normalizeSearchListDispatchLine,
  searchListDefaultEffectScopes,
  searchListEffectScopesForToken
} from "./search-list-picker-parse.ts"
import { stripInvisibleFormatChars } from "../bmxt-core/line-parse.ts"
import {
  parseDeviceListScopeTokens,
  type DeviceListScope
} from "../sync/bus/device-list-scope.ts"

export type SearchListLineOptions = {
  /** EN: Full original-ish line including device flags (for logging). */
  dispatchLine: string
  /** EN: Line without `--device` / `--peers` (effects + peer RPC). */
  peerDispatchLine: string
  scope: DeviceListScope
}

function normalizeToken(token: string): string {
  return stripInvisibleFormatChars(token.trim()).toLowerCase()
}

/**
 * EN: Parse `search -list [--all|…] [--unlimit] [--device <id>|--peers] [<pattern>]`.
 */
export function parseSearchListLine(trimmed: string): SearchListLineOptions | null {
  const parts = trimmed.trim().split(/\s+/).filter((part) => part.length > 0)
  if (parts.length < 2) {
    return null
  }
  if (normalizeToken(parts[0]!) !== "search") {
    return null
  }
  if (normalizeToken(parts[1]!) !== "-list") {
    return null
  }

  const scoped = parseDeviceListScopeTokens(parts.slice(2))
  if (!scoped.ok) {
    return null
  }

  const peerParts = ["search", "-list", ...scoped.rest]
  const peerDispatchLine = normalizeSearchListDispatchLine(peerParts.join(" "))
  const dispatchLine = normalizeSearchListDispatchLine(
    ["search", "-list", ...parts.slice(2)].join(" ")
  )

  return {
    dispatchLine,
    peerDispatchLine,
    scope: scoped.scope
  }
}

export function searchListLineHasScopeToken(trimmed: string): boolean {
  const parts = trimmed.trim().split(/\s+/).filter(Boolean)
  if (parts.length < 3) {
    return false
  }
  const scoped = parseDeviceListScopeTokens(parts.slice(2))
  if (!scoped.ok) {
    return false
  }
  if (scoped.rest.length === 0) {
    return false
  }
  return isSearchListScopeToken(normalizeToken(scoped.rest[0]!))
}

export function searchListEffectScopesFromLine(trimmed: string): readonly string[] {
  const parts = trimmed.trim().split(/\s+/).filter(Boolean)
  if (parts.length < 2) {
    return searchListDefaultEffectScopes()
  }
  const scoped = parseDeviceListScopeTokens(parts.slice(2))
  const rest = scoped.ok ? scoped.rest : parts.slice(2)
  if (rest.length >= 1 && isSearchListScopeToken(normalizeToken(rest[0]!))) {
    return searchListEffectScopesForToken(normalizeToken(rest[0]!))
  }
  return searchListDefaultEffectScopes()
}
