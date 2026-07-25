/**
 * EN: `tab:` / `tab::` live tab picker — `#t:<id>` chips; Space continues; Enter activates.
 * JA: `tab:` / `tab::` ライブ候補 — `#t:<id>` チップ。Space で継続選択、Enter でアクティブ。
 */

import { resolveActiveCommandSegment } from "../command-line/compound/active-segment.ts"
import {
  findNavReloadTabTokenSpans,
  formatNavReloadTabToken,
  listNavReloadTabCandidates,
  navReloadTabChipMetaFromCandidate,
  parseNavReloadTabToken,
  type NavReloadTabCandidate,
  type NavReloadTabChipMeta
} from "./nav-reload-tab-token.ts"

export type TabChipFilterMode = "title" | "url"

export type TabChipCompletionZone = {
  tokenStart: number
  tokenEnd: number
  /** EN: Filter needle after `tab:` / `tab::` or after chips + Space (may be empty). */
  needle: string
  mode: TabChipFilterMode
}

/** EN: True when token is an incomplete `tab:` / `tab::{needle}` trigger (not a finished chip). */
export function isTabChipTriggerToken(token: string): boolean {
  const t = token.trim()
  return /^tab::/i.test(t) || /^tab:/i.test(t)
}

/** EN: True when every whitespace token is a `#t:<id>` chip (and at least one exists). */
export function isOnlyTabChipTokens(text: string): boolean {
  const trimmed = text.trim()
  if (trimmed.length === 0) {
    return false
  }
  const tokens = trimmed.split(/\s+/).filter((t) => t.length > 0)
  if (tokens.length === 0) {
    return false
  }
  for (const tok of tokens) {
    if (parseNavReloadTabToken(tok) === null) {
      return false
    }
  }
  return true
}

/**
 * EN: Parse `tab:` / `tab::{needle}` / continuation after chips (Space / title needle).
 * Does not match `tab` (command) or `tab -list`.
 */
export function tabChipCompletionZone(
  line: string,
  cursor: number
): TabChipCompletionZone | null {
  const active = resolveActiveCommandSegment(line, cursor)
  const segmentLine = line.slice(active.segmentStart, active.segmentEnd)
  const localCursor = active.localCursor
  if (localCursor < 0 || localCursor > segmentLine.length) {
    return null
  }

  const before = segmentLine.slice(0, localCursor)
  const lastSpace = before.lastIndexOf(" ")
  const tokenStartLocal = lastSpace + 1
  let tokenEndLocal = localCursor
  while (tokenEndLocal < segmentLine.length && !/\s/.test(segmentLine[tokenEndLocal]!)) {
    tokenEndLocal += 1
  }
  const token = segmentLine.slice(tokenStartLocal, tokenEndLocal)

  const urlMatch = /^tab::(.*)$/i.exec(token)
  if (urlMatch) {
    return {
      tokenStart: active.segmentStart + tokenStartLocal,
      tokenEnd: active.segmentStart + tokenEndLocal,
      needle: urlMatch[1] ?? "",
      mode: "url"
    }
  }

  const titleMatch = /^tab:(.*)$/i.exec(token)
  if (titleMatch) {
    return {
      tokenStart: active.segmentStart + tokenStartLocal,
      tokenEnd: active.segmentStart + tokenEndLocal,
      needle: titleMatch[1] ?? "",
      mode: "title"
    }
  }

  // EN: Continuation — only after one or more `#t:` chips (Space reopens / title filter).
  const prefix = segmentLine.slice(0, tokenStartLocal)
  if (!isOnlyTabChipTokens(prefix)) {
    return null
  }

  if (token.length === 0) {
    return {
      tokenStart: active.segmentStart + tokenStartLocal,
      tokenEnd: active.segmentStart + tokenEndLocal,
      needle: "",
      mode: "title"
    }
  }

  if (parseNavReloadTabToken(token) !== null) {
    return null
  }

  return {
    tokenStart: active.segmentStart + tokenStartLocal,
    tokenEnd: active.segmentStart + tokenEndLocal,
    needle: token,
    mode: "title"
  }
}

/** EN: Title / URL filter for `tab:` picker (case-insensitive contains). */
export function matchesTabChipNeedle(
  title: string,
  url: string,
  needle: string,
  mode: TabChipFilterMode
): boolean {
  const raw = needle.trim()
  if (raw.length === 0) {
    return true
  }
  if (mode === "url") {
    return url.toLowerCase().includes(raw.toLowerCase())
  }
  return title.toLowerCase().includes(raw.toLowerCase())
}

/**
 * EN: Open-tab candidates for the `tab:` zone.
 * Reuses chrome.tabs listing; applies title/URL mode; excludes already-selected `#t:` ids.
 */
export async function listTabChipCandidates(
  zone: TabChipCompletionZone,
  line: string
): Promise<NavReloadTabCandidate[]> {
  const selected = new Set(findNavReloadTabTokenSpans(line).map((s) => s.tabId))
  // EN: listNavReloadTabCandidates uses legacy @-url / title filter; pass "" and filter here.
  const all = await listNavReloadTabCandidates("")
  const out: NavReloadTabCandidate[] = []
  for (const c of all) {
    if (selected.has(c.tabId)) {
      continue
    }
    if (!matchesTabChipNeedle(c.title, c.url, zone.needle, zone.mode)) {
      continue
    }
    out.push(c)
  }
  return out
}

/**
 * EN: After pick: replace trigger / needle / empty slot with `#t:<id>` only (no `tab:` re-append).
 * Menu closes on next sync because caret sits on/after a chip with no continuation zone.
 */
export function applyTabChipPickToLine(
  line: string,
  tokenStart: number,
  tokenEnd: number,
  tabId: number
): { line: string; cursor: number } {
  const chip = formatNavReloadTabToken(tabId)
  const nextLine = `${line.slice(0, tokenStart)}${chip}${line.slice(tokenEnd)}`
  const cursor = tokenStart + chip.length
  return { line: nextLine, cursor }
}

export { navReloadTabChipMetaFromCandidate, formatNavReloadTabToken }
export type { NavReloadTabCandidate, NavReloadTabChipMeta }
