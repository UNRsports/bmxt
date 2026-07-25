/**
 * EN: `tab:` / `tab::` live tab picker — `#t:<id>` chips; Space continues; Enter activates.
 * JA: `tab:` / `tab::` ライブ候補 — `#t:<id>` チップ。Space で継続選択、Enter でアクティブ。
 */

import { resolveActiveCommandSegment } from "../command-line/compound/active-segment.ts"
import { resolveActivePipeStage } from "../command-line/compound/pipe-stage-spans.ts"
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

/**
 * EN: True when tokens are only `#t:<id>` chips and optional `tab:` / `tab::…` triggers,
 *     with at least one chip (producer / continuation prefix).
 */
export function isOnlyTabChipTokens(text: string): boolean {
  const trimmed = text.trim()
  if (trimmed.length === 0) {
    return false
  }
  const tokens = trimmed.split(/\s+/).filter((t) => t.length > 0)
  if (tokens.length === 0) {
    return false
  }
  let sawChip = false
  for (const tok of tokens) {
    if (parseNavReloadTabToken(tok) !== null) {
      sawChip = true
      continue
    }
    if (isTabChipTriggerToken(tok)) {
      continue
    }
    return false
  }
  return sawChip
}

/** EN: `tab:` (title) or `tab::` (url) command introducer for history / log echo. */
export function tabChipCommandPrefix(mode: TabChipFilterMode): "tab:" | "tab::" {
  return mode === "url" ? "tab::" : "tab:"
}

/**
 * EN: Parse `tab:` / `tab::{needle}` / continuation after chips (Space / title needle).
 * Does not match `tab` (command) or `tab -list`. Ignores pipe consumer stages (after `|`).
 */
export function tabChipCompletionZone(
  line: string,
  cursor: number
): TabChipCompletionZone | null {
  const active = resolveActiveCommandSegment(line, cursor)
  const segmentLine = line.slice(active.segmentStart, active.segmentEnd)
  const pipe = resolveActivePipeStage(segmentLine, active.localCursor)
  if (pipe.stageIndex >= 1) {
    return null
  }

  const stageLine = segmentLine.slice(pipe.stageStart, pipe.stageEnd)
  const localCursor = pipe.localCursor
  if (localCursor < 0 || localCursor > stageLine.length) {
    return null
  }

  const before = stageLine.slice(0, localCursor)
  const lastSpace = before.lastIndexOf(" ")
  const tokenStartLocal = lastSpace + 1
  let tokenEndLocal = localCursor
  while (tokenEndLocal < stageLine.length && !/\s/.test(stageLine[tokenEndLocal]!)) {
    tokenEndLocal += 1
  }
  const token = stageLine.slice(tokenStartLocal, tokenEndLocal)
  const absBase = active.segmentStart + pipe.stageStart

  const urlMatch = /^tab::(.*)$/i.exec(token)
  if (urlMatch) {
    return {
      tokenStart: absBase + tokenStartLocal,
      tokenEnd: absBase + tokenEndLocal,
      needle: urlMatch[1] ?? "",
      mode: "url"
    }
  }

  const titleMatch = /^tab:(.*)$/i.exec(token)
  if (titleMatch) {
    return {
      tokenStart: absBase + tokenStartLocal,
      tokenEnd: absBase + tokenEndLocal,
      needle: titleMatch[1] ?? "",
      mode: "title"
    }
  }

  // EN: `tab: ` / `tab:: ` with no chip yet (e.g. history recall then delete chip) — reopen filter.
  const prefix = stageLine.slice(0, tokenStartLocal)
  const prefixTrimmed = prefix.trim()
  if (
    parseNavReloadTabToken(token) === null &&
    !isTabChipTriggerToken(token) &&
    (/^tab::$/i.test(prefixTrimmed) || /^tab:$/i.test(prefixTrimmed))
  ) {
    return {
      tokenStart: absBase + tokenStartLocal,
      tokenEnd: absBase + tokenEndLocal,
      needle: token,
      mode: /^tab::/i.test(prefixTrimmed) ? "url" : "title"
    }
  }

  // EN: Continuation — only after one or more `#t:` chips (Space reopens / title filter).
  if (!isOnlyTabChipTokens(prefix)) {
    return null
  }

  if (token.length === 0) {
    return {
      tokenStart: absBase + tokenStartLocal,
      tokenEnd: absBase + tokenEndLocal,
      needle: "",
      mode: "title"
    }
  }

  if (parseNavReloadTabToken(token) !== null) {
    return null
  }

  return {
    tokenStart: absBase + tokenStartLocal,
    tokenEnd: absBase + tokenEndLocal,
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
 * EN: After pick: keep `tab:` / `tab::` command prefix + `#t:<id>` wire chip (id stays internal).
 * JA: 選択後は `tab:` / `tab::` を残し、ワイヤは `#t:<id>`（UI には ID を出さない）。
 * Menu closes on next sync when caret sits on/after a chip with no continuation zone.
 */
export function applyTabChipPickToLine(
  line: string,
  tokenStart: number,
  tokenEnd: number,
  tabId: number,
  mode: TabChipFilterMode = "title"
): { line: string; cursor: number } {
  const chip = formatNavReloadTabToken(tabId)
  const beforeTrimEnd = line.slice(0, tokenStart).replace(/\s+$/, "")
  const after = line.slice(tokenEnd).replace(/^\s+/, "")
  const commandPrefix = tabChipCommandPrefix(mode)

  let head: string
  if (beforeTrimEnd.length === 0) {
    head = `${commandPrefix} ${chip}`
  } else {
    head = `${beforeTrimEnd} ${chip}`
  }
  const nextLine = after.length === 0 ? head : `${head} ${after}`
  return { line: nextLine, cursor: head.length }
}

export { navReloadTabChipMetaFromCandidate, formatNavReloadTabToken }
export type { NavReloadTabCandidate, NavReloadTabChipMeta }
