import type { ChromeEffect } from "../dispatch/effect-types"
import {
  isSearchListScopeToken,
  searchListDefaultEffectScopes,
  searchListEffectScopesForToken,
  searchListPatternFromLine
} from "./search-list-picker-parse"
import { normalizeSearchPattern } from "./search-format"

function normalizeScopeToken(token: string): string {
  return token.trim().toLowerCase()
}

export function searchEffectForScope(scope: string, pattern: string): ChromeEffect {
  switch (scope) {
    case "--history":
      return { kind: "search_history", pattern }
    case "--bookmark":
      return { kind: "search_bookmark", pattern }
    case "--page":
      return { kind: "search_page", pattern }
    case "--snapshot":
      return { kind: "search_snapshot", pattern }
    default:
      throw new Error(`bad search scope (${scope})`)
  }
}

/** EN: Chrome effects for a normalized `search -list …` dispatch line (no `--picker`). */
export function searchEffectsForDispatchLine(dispatchLine: string): ChromeEffect[] {
  const parts = dispatchLine.trim().split(/\s+/).filter((part) => part.length > 0)
  const pattern = normalizeSearchPattern(searchListPatternFromLine(dispatchLine))
  if (parts.length <= 2) {
    return searchListDefaultEffectScopes().map((scope) => searchEffectForScope(scope, pattern))
  }
  const third = normalizeScopeToken(parts[2]!)
  const scopes = isSearchListScopeToken(third)
    ? searchListEffectScopesForToken(third)
    : searchListDefaultEffectScopes()
  return scopes.map((scope) => searchEffectForScope(scope, pattern))
}
