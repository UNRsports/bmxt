/**
 * EN: Build typed command lines that picker Enter submits via `submitConstructedLine`.
 * JA: ピッカー Enter が `submitConstructedLine` に渡す型付きコマンド行を組み立てる。
 */

import { normalizePickerOpenUrl } from "../side-picker/model/normalize-picker-open-url.ts"
import type { PickerEntry } from "../side-picker/model/picker-entry.ts"
import type { SearchOpenDestinationRow } from "../search/search-open-destination.ts"
import {
  buildSessionSwitchCommandLine,
  type SessionListRow
} from "../session/session-summary.ts"
import {
  buildGoogleSheetsCellUrl,
  isGoogleSheetsUrl,
  parseGoogleSheetsUrl
} from "../url/parse-google-sheets-url.ts"

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

/** EN: `#t:… | close` for bulk tab close via pipe consumer. */
export function buildTabCloseCommandLine(tabIds: readonly number[]): string | null {
  if (tabIds.length === 0) {
    return null
  }
  return `${tabIds.map((id) => `#t:${id}`).join(" ")} | close`
}

/** EN: `#t:… | reload` for bulk tab reload via pipe consumer. */
export function buildTabReloadCommandLine(tabIds: readonly number[]): string | null {
  if (tabIds.length === 0) {
    return null
  }
  return `${tabIds.map((id) => `#t:${id}`).join(" ")} | reload`
}

/**
 * EN: `open --into-window <id> <url>` for new-tab URL panel.
 * Returns null when URL is empty or not http(s) — caller keeps Chrome create fallback.
 */
export function buildOpenIntoWindowCommandLine(
  windowId: number,
  urlRaw: string
): string | null {
  if (windowId < 0) {
    return null
  }
  const url = normalizePickerOpenUrl(urlRaw)
  if (url === undefined) {
    return null
  }
  return `open --into-window ${windowId} ${shellQuote(url)}`
}

/** EN: `tab -activate <tabId>` — local tab focus from picker Enter. */
export function buildTabActivateCommandLine(tabId: number): string | null {
  if (tabId < 0) {
    return null
  }
  return `tab -activate ${tabId}`
}

/** EN: `close --window <id…>` for marked window close. */
export function buildCloseWindowsCommandLine(windowIds: readonly number[]): string | null {
  const ids = windowIds.filter((id) => id >= 0)
  if (ids.length === 0) {
    return null
  }
  return `close --window ${ids.join(" ")}`
}

/** EN: `close --group <groupId>` — remove all tabs in the group. */
export function buildCloseGroupCommandLine(groupId: number): string | null {
  if (groupId < 0) {
    return null
  }
  return `close --group ${groupId}`
}

/** EN: `group ungroup <groupId>`. */
export function buildGroupUngroupCommandLine(groupId: number): string | null {
  if (groupId < 0) {
    return null
  }
  return `group ungroup ${groupId}`
}

/** EN: `group rename <groupId> <title>`. */
export function buildGroupRenameCommandLine(groupId: number, title: string): string | null {
  if (groupId < 0) {
    return null
  }
  return `group rename ${groupId} ${shellQuote(title.trim())}`
}

/**
 * EN: `group new <tabId…> [--title …] [--color …]`.
 * Color must already be a Chrome tabGroups color enum string.
 */
export function buildGroupNewCommandLine(
  tabIds: readonly number[],
  opts?: { title?: string; color?: string }
): string | null {
  if (tabIds.length === 0) {
    return null
  }
  const parts = ["group", "new", ...tabIds.map(String)]
  const title = opts?.title?.trim() ?? ""
  if (title.length > 0) {
    parts.push("--title", shellQuote(title))
  }
  const color = opts?.color?.trim() ?? ""
  if (color.length > 0) {
    parts.push("--color", color)
  }
  return parts.join(" ")
}

/** EN: `window rename <windowId> <name>` — display name in extension storage. */
export function buildWindowRenameCommandLine(windowId: number, name: string): string | null {
  if (windowId < 0) {
    return null
  }
  return `window rename ${windowId} ${shellQuote(name.trim())}`
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
    // EN: Pass Sheets URL (with range when cellRef known) so jump uses Find/Name Box / tabs.update.
    //     Do not quote `#` URLs — tokenizer is whitespace-only and would keep quote chars.
    // JA: Sheets URL（cellRef があれば range 付き）を渡し Find／Name Box／tabs.update へ。
    //     `#` URL は引用しない（tokenize は空白分割のみで引用符が残る）。
    let url = normalizePickerOpenUrl(entry.url)
    if (url !== undefined && isGoogleSheetsUrl(url) && match?.cellRef) {
      const sheetParts = parseGoogleSheetsUrl(url)
      if (sheetParts) {
        const ranged = buildGoogleSheetsCellUrl(sheetParts, match.cellRef)
        if (ranged) {
          url = ranged
        }
      }
    }
    if (url !== undefined) {
      parts.push("--url", url)
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

/** EN: Compat alias — settings commit on apply; this only closes the column. */
export function buildSettingSaveCommandLine(): string {
  return "setting -exit -list"
}

/** EN: Compat alias — no draft to discard; closes the column. */
export function buildSettingCancelCommandLine(): string {
  return "setting -exit -list"
}
