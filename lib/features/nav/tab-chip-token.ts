/**
 * EN: `tab:` / `tab::` live tab picker — multi-select chips (`#t:<id>`) for pipe LHS.
 * JA: `tab:` / `tab::` ライブ候補 — パイプ左辺用 `#t:<id>` 複数選択。
 */

import { resolveActiveCommandSegment } from "../command-line/compound/active-segment.ts"
import {
  findNavReloadTabTokenSpans,
  formatNavReloadTabToken,
  listNavReloadTabCandidates,
  navReloadTabChipMetaFromCandidate,
  type NavReloadTabCandidate,
  type NavReloadTabChipMeta
} from "./nav-reload-tab-token.ts"

export type TabChipFilterMode = "title" | "url"

export type TabChipCompletionZone = {
  tokenStart: number
  tokenEnd: number
  /** EN: Filter needle after `tab:` or `tab::` (may be empty). */
  needle: string
  mode: TabChipFilterMode
}

/** EN: True when token is an incomplete `tab:` / `tab::{needle}` trigger (not a finished chip). */
export function isTabChipTriggerToken(token: string): boolean {
  const t = token.trim()
  return /^tab::/i.test(t) || /^tab:/i.test(t)
}

/**
 * EN: Parse `tab:` / `tab::{needle}` / `tab:{needle}` at the token under the caret.
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
  if (token.length === 0) {
    return null
  }

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
    // EN: `tab::` already handled; bare `tab:` or `tab:needle` is title mode.
    return {
      tokenStart: active.segmentStart + tokenStartLocal,
      tokenEnd: active.segmentStart + tokenEndLocal,
      needle: titleMatch[1] ?? "",
      mode: "title"
    }
  }

  return null
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

/** EN: After pick: replace trigger with `#t:<id> ` and re-append `tab:` for continued selection. */
export function applyTabChipPickToLine(
  line: string,
  tokenStart: number,
  tokenEnd: number,
  tabId: number
): { line: string; cursor: number } {
  const chip = formatNavReloadTabToken(tabId)
  const nextLine = `${line.slice(0, tokenStart)}${chip} tab:${line.slice(tokenEnd)}`
  const cursor = tokenStart + chip.length + " tab:".length
  return { line: nextLine, cursor }
}

export { navReloadTabChipMetaFromCandidate, formatNavReloadTabToken }
export type { NavReloadTabCandidate, NavReloadTabChipMeta }
