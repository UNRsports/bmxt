/**
 * EN: Pure prompt parsing for `dom -list` option tokens (completion / placeholder).
 * JA: `dom -list` のオプショントークン解析（補完・プレースホルダ）。
 */

import { resolveActiveCommandSegment } from "../command-line/compound/active-segment.ts"
import { wordBounds } from "../format/word-bounds.ts"
import {
  DOM_LIST_OPTION_TOKENS_WITH_TAG,
  DOM_LIST_SHOW_TAG_TOKEN
} from "./dom-picker-mode.ts"
import { domListLineHasFlavor } from "./parse-dom-list-args.ts"

export const DOM_LIST_OPTION_TOKENS = DOM_LIST_OPTION_TOKENS_WITH_TAG

function domListParts(trimmed: string): string[] {
  return trimmed.trim().split(/\s+/).filter((s) => s.length > 0)
}

/** EN: Manifest trailing token after `dom -list`. */
export function isDomListOptionToken(token: string): boolean {
  const t = token.trim().toLowerCase()
  return DOM_LIST_OPTION_TOKENS.some((o) => o === t)
}

export function domListOptionTokensUsed(tokensAfterList: readonly string[]): string[] {
  return tokensAfterList.filter((t) => isDomListOptionToken(t))
}

/** EN: Options not yet present (mode and flavor are each at most one). */
export function listDomListRemainingOptionCandidates(
  tokensAfterList: readonly string[],
  prefix: string
): string[] {
  const used = domListOptionTokensUsed(tokensAfterList).map((t) => t.toLowerCase())
  const hasNormal = used.includes("--normal")
  const hasWith = used.includes("--with")
  const hasHtml = used.includes("--html")
  const hasReact = used.includes("--react")
  const hasTag = used.includes(DOM_LIST_SHOW_TAG_TOKEN)

  const remaining: string[] = []
  if (!hasNormal && !hasWith) {
    remaining.push("--normal", "--with")
  }
  if (!hasHtml && !hasReact) {
    remaining.push("--html", "--react")
  }
  if (hasWith && !hasTag) {
    remaining.push(DOM_LIST_SHOW_TAG_TOKEN)
  }

  const p = prefix.trim().toLowerCase()
  if (p.length === 0) {
    return remaining
  }
  return remaining.filter((t) => t.toLowerCase().startsWith(p))
}

/** EN: Partial option token still narrowing (e.g. `--h` → `--html`). */
export function matchesDomListOptionFilter(token: string): boolean {
  const t = token.trim().toLowerCase()
  if (t.length === 0) {
    return false
  }
  if (t.startsWith("--")) {
    return DOM_LIST_OPTION_TOKENS.some((o) => o.startsWith(t))
  }
  return DOM_LIST_OPTION_TOKENS.some((o) => o.includes(t))
}

/** EN: `dom -list ` — optional mode / flavor tokens may follow. */
export function isDomListAwaitingOptionsOrPattern(line: string): boolean {
  const trimmed = line.trim()
  const parts = domListParts(trimmed)
  return (
    parts.length === 2 &&
    parts[0]!.toLowerCase() === "dom" &&
    parts[1]!.toLowerCase() === "-list" &&
    line.endsWith(" ")
  )
}

/** EN: Trailing space after `-list` and more option tokens remain (e.g. `dom -list --with `). */
export function isDomListAwaitingMoreOptionsAtEol(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed.toLowerCase().startsWith("dom -list")) {
    return false
  }
  if (!line.endsWith(" ")) {
    return false
  }
  const parts = domListParts(trimmed)
  if (
    parts.length < 2 ||
    parts[0]!.toLowerCase() !== "dom" ||
    parts[1]!.toLowerCase() !== "-list"
  ) {
    return false
  }
  return listDomListRemainingOptionCandidates(parts.slice(2), "").length > 0
}

/** EN: Bare `dom -list` without trailing space — continuation restores `dom -list `. */
export function isDomListContinuationPrompt(line: string): boolean {
  const trimmed = line.trim()
  const parts = domListParts(trimmed)
  if (
    parts.length !== 2 ||
    parts[0]!.toLowerCase() !== "dom" ||
    parts[1]!.toLowerCase() !== "-list"
  ) {
    return false
  }
  return !line.endsWith(" ")
}

/**
 * EN: Cursor still editing an optional flag — show option menu, not pattern placeholder.
 * JA: オプションフラグ入力中 — オプションメニューを表示する。
 */
export function isEditingDomListOptionToken(line: string, cursor: number): boolean {
  const trimmed = line.trim()
  if (!trimmed.toLowerCase().startsWith("dom -list")) {
    return false
  }
  const [l, r] = wordBounds(line, cursor)
  const token = line.slice(l, r)
  if (token.length === 0) {
    return false
  }
  if (isDomListOptionToken(token)) {
    return false
  }
  if (!matchesDomListOptionFilter(token) && !token.startsWith("--")) {
    return false
  }
  return true
}

/** EN: Flavor fixed — free-text pattern tail; suppress option IME menu. */
export function shouldShowDomListPatternPlaceholder(line: string, cursor: number): boolean {
  const active = resolveActiveCommandSegment(line, cursor)
  const segmentLine = line.slice(active.segmentStart, active.segmentEnd)
  const segmentCursor = active.localCursor
  const trimmed = segmentLine.trim()
  if (isDomListContinuationPrompt(segmentLine)) {
    return false
  }
  if (!trimmed.toLowerCase().startsWith("dom -list")) {
    return false
  }
  if (isEditingDomListOptionToken(segmentLine, segmentCursor)) {
    return false
  }
  const parts = domListParts(trimmed)
  if (parts.length === 2 && segmentLine.endsWith(" ")) {
    return false
  }
  if (parts.length < 3) {
    return false
  }
  if (!domListLineHasFlavor(trimmed)) {
    return false
  }
  return domListPatternFromLine(trimmed).length === 0
}

/** EN: Pattern text after option tokens (may be empty). */
export function domListPatternFromLine(trimmed: string): string {
  const parts = domListParts(trimmed)
  if (parts.length <= 2) {
    return ""
  }
  return parts.slice(2).filter((t) => !isDomListOptionToken(t)).join(" ")
}
