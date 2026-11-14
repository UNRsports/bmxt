/**
 * EN: Re-collect body hits for one open-tab picker entry (detail view safety net).
 * JA: 開タブの詳細一覧用に、本文ヒットをタブ内で再収集する。
 */

import type { PickerEntry } from "../side-picker/model/picker-entry"
import { collectPageMatchesFromOpenTab } from "../page-extract/collect-tab-page-matches"
import { MAX_MATCHES_PER_TAB, PAGE_SCAN_PREFIX_CHARS } from "./limits"
import { resolveOpenTabForSearchEntry } from "./search-entry-open-tab"

/**
 * EN: Returns a copy with refreshed `pageMatches` when the tab is scriptable and
 *     in-page collection finds more body hits. Otherwise returns the original entry.
 * JA: タブがスクリプト可能でより多い本文ヒットが取れたときだけ `pageMatches` を更新したコピーを返す。
 */
export async function refreshSearchEntryPageMatches(
  entry: PickerEntry,
  pattern: string
): Promise<PickerEntry> {
  const needle = pattern.trim()
  if (!needle) {
    return entry
  }
  const resolved = await resolveOpenTabForSearchEntry(entry)
  if (!resolved) {
    return entry
  }
  let tab: chrome.tabs.Tab
  try {
    tab = await chrome.tabs.get(resolved.tabId)
  } catch {
    return entry
  }
  const collected = await collectPageMatchesFromOpenTab(tab, needle, {
    maxMatches: MAX_MATCHES_PER_TAB,
    maxTextChars: PAGE_SCAN_PREFIX_CHARS
  })
  if (collected === null) {
    return entry
  }
  const nextBody = collected.matches.filter((m) => m.lineNo > 0).length
  const curBody = (entry.pageMatches ?? []).filter((m) => m.lineNo > 0).length
  if (nextBody === 0 || nextBody <= curBody) {
    return entry
  }
  return {
    ...entry,
    tabId: entry.tabId ?? resolved.tabId,
    windowId: entry.windowId ?? resolved.windowId,
    pageMatches: collected.matches
  }
}
