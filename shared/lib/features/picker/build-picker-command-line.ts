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

/** EN: Open a search hit URL (window / group / new-window flags). */
export function buildSearchOpenCommandLine(
  entry: PickerEntry,
  destination?: SearchOpenDestinationRow
): string | null {
  const url = normalizePickerOpenUrl(entry.url)
  if (url === undefined) {
    return null
  }
  const quoted = shellQuote(url)
  if (destination === undefined) {
    return `open ${quoted}`
  }
  if (destination.kind === "new_window") {
    return `open --window ${quoted}`
  }
  if (destination.kind === "group" && destination.groupId !== undefined && destination.windowId !== undefined) {
    return `open --into-group ${destination.groupId} --window-id ${destination.windowId} ${quoted}`
  }
  if (
    (destination.kind === "window" || destination.kind === "ungrouped") &&
    destination.windowId !== undefined
  ) {
    return `open --into-window ${destination.windowId} ${quoted}`
  }
  return `open ${quoted}`
}

/** EN: `#t:… | move --window <id>` / `--group` / `--ungroup`. */
export function buildTabMoveCommandLine(
  tabIds: readonly number[],
  opts: { windowId: number; groupId?: number; ungroup?: boolean }
): string | null {
  if (tabIds.length === 0 || opts.windowId < 0) {
    return null
  }
  const chips = tabIds.map((id) => `#t:${id}`).join(" ")
  if (opts.ungroup) {
    return `${chips} | move --ungroup --window ${opts.windowId}`
  }
  if (opts.groupId !== undefined && opts.groupId >= 0) {
    return `${chips} | move --group ${opts.groupId} --window ${opts.windowId}`
  }
  return `${chips} | move --window ${opts.windowId}`
}

export function buildTabNewWindowCommandLine(tabIds: readonly number[]): string | null {
  if (tabIds.length === 0) {
    return null
  }
  return `${tabIds.map((id) => `#t:${id}`).join(" ")} | new-window`
}

export function buildTabGroupAddCommandLine(
  tabIds: readonly number[],
  groupId: number
): string | null {
  if (tabIds.length === 0 || groupId < 0) {
    return null
  }
  return `group add ${groupId} ${tabIds.join(" ")}`
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
