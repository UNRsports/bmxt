/** EN: Parse `search -list` tokens (`--picker`, scope, pattern). */

import {
  isSearchListScopeToken,
  normalizeSearchListDispatchLine,
  searchListDefaultEffectScopes,
  searchListEffectScopesForToken
} from "./search-list-picker-parse.ts"
import { stripInvisibleFormatChars } from "../bmxt-core/line-parse.ts"

export type SearchListLineOptions = {
  picker: boolean
  dispatchLine: string
}

function normalizeToken(token: string): string {
  return stripInvisibleFormatChars(token.trim()).toLowerCase()
}

/**
 * EN: Parse `search -list [--all|--history|--bookmark|--page|--snapshot] [--picker] [<pattern>]`.
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

  let picker = false
  const kept: string[] = ["search", "-list"]

  for (let index = 2; index < parts.length; index += 1) {
    const raw = parts[index]!
    const token = normalizeToken(raw)
    if (token === "--picker") {
      picker = true
      continue
    }
    kept.push(raw)
  }

  const dispatchLine = normalizeSearchListDispatchLine(kept.join(" "))
  return { picker, dispatchLine }
}

/** EN: `search -list --picker` — open search list picker UI. */
export function parseSearchListPickerLine(trimmed: string): string | null {
  const parsed = parseSearchListLine(trimmed)
  if (parsed === null || !parsed.picker) {
    return null
  }
  return parsed.dispatchLine
}

export function searchListLineHasScopeToken(trimmed: string): boolean {
  const parts = trimmed.trim().split(/\s+/).filter(Boolean)
  if (parts.length < 3) {
    return false
  }
  return isSearchListScopeToken(normalizeToken(parts[2]!))
}

export function searchListEffectScopesFromLine(trimmed: string): readonly string[] {
  const parts = trimmed.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 3 && isSearchListScopeToken(normalizeToken(parts[2]!))) {
    return searchListEffectScopesForToken(normalizeToken(parts[2]!))
  }
  return searchListDefaultEffectScopes()
}
