/**
 * EN: Build typed command lines that picker Enter submits via `submitConstructedLine`.
 * JA: ピッカー Enter が `submitConstructedLine` に渡す型付きコマンド行を組み立てる。
 */

import { normalizePickerOpenUrl } from "../side-picker/model/normalize-picker-open-url.ts"
import type { PickerEntry } from "../side-picker/model/picker-entry.ts"
import type { SearchOpenDestinationRow } from "../search/search-open-destination.ts"
import { buildSessionSwitchCommandLine, type SessionListRow } from "../session"

function shellQuote(value: string): string {
  if (/^[A-Za-z0-9_./:?&=%+#@~-]+$/.test(value)) {
    return value
  }
  return `'${value.replace(/'/g, `'\\''`)}'`
}

/** EN: `session -switch <name>` for list / switch picker Enter. */
export function buildSessionSwitchSubmitLine(
  row: SessionListRow,
  allRows: readonly SessionListRow[]
): string {
  return buildSessionSwitchCommandLine(row, allRows)
}

/** EN: Open a search hit URL (optional `--window`). */
export function buildSearchOpenCommandLine(
  entry: PickerEntry,
  destination?: SearchOpenDestinationRow
): string | null {
  const url = normalizePickerOpenUrl(entry.url)
  if (url === undefined) {
    return null
  }
  if (destination?.kind === "new_window") {
    return `open --window ${shellQuote(url)}`
  }
  return `open ${shellQuote(url)}`
}

/**
 * EN: Jump to an existing tab / page match / DOM path.
 * Prefer jump when a tab id is known; otherwise fall back to open.
 */
export function buildSearchJumpCommandLine(
  entry: PickerEntry,
  matchIndex: number,
  searchPattern: string
): string | null {
  const needle = searchPattern.trim()
  if (entry.tabId != null && entry.tabId > 0 && needle.length > 0) {
    const parts = [
      "jump",
      "--tab",
      String(entry.tabId),
      "--needle",
      shellQuote(needle),
      "--match-index",
      String(Math.max(0, matchIndex))
    ]
    const match = entry.pageMatches?.[matchIndex]
    if (match && match.lineNo > 0) {
      parts.push("--line", String(match.lineNo))
    }
    return parts.join(" ")
  }
  return buildSearchOpenCommandLine(entry)
}

export function buildDomJumpCommandLine(
  tabId: number,
  path: readonly number[],
  activateLink: boolean
): string {
  const parts = ["jump", "--tab", String(tabId), "--path", path.join(".")]
  if (activateLink) {
    parts.push("--link")
  }
  return parts.join(" ")
}

export function buildSettingSaveCommandLine(): string {
  return "setting -save"
}

export function buildSettingCancelCommandLine(): string {
  return "setting -cancel"
}
