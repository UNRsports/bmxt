import { createTabInNormalBrowserWindow } from "../dispatch/handlers/shared"
import { resolveSearchPickerPageMatch, lineHitIndexForPageMatch } from "./search-picker-page-match"
import { navigateSheetsTabToCell } from "./sources/navigate-sheets-to-cell"
import { scrollSearchPageToNeedle } from "./sources/page-scroll-to-search-needle"
import { executePickerFocusPlan } from "../side-picker/model/focus-picker-entry"
import { openEntryEffects } from "../side-picker/model/open-entry"
import { normalizePickerOpenUrl } from "../side-picker/model/normalize-picker-open-url"
import type { PickerEntry, SearchPageMatch } from "../side-picker/model/picker-entry"
import {
  buildGoogleSheetsCellUrl,
  isGoogleSheetsUrl,
  parseGoogleSheetsUrl
} from "../url/parse-google-sheets-url"
import { isScriptablePageUrl } from "../url/is-scriptable-page-url"
import {
  resolveOpenTabForSearchEntry,
  type OpenTabResolution
} from "./search-entry-open-tab"
import {
  openUrlAtSearchDestination,
  type SearchOpenDestinationRow
} from "./search-open-destination"
import type { HostEffect } from "../dispatch/effect-types"
import type { DispatchHostContext } from "../dispatch/dispatch-context"
import { applyHostEffects } from "../dispatch/apply-effects"
import { tSearch } from "../setting/i18n/ns/search"
import { DEFAULT_UI_LOCALE } from "../setting/locale"

const TAB_FOCUS_DELAY_MS = 120
const TAB_LOAD_TIMEOUT_MS = 20000

function scrollFailedLog(ctx: DispatchHostContext): string {
  return tSearch("search.scrollToMatch.failed", ctx.uiLocale ?? DEFAULT_UI_LOCALE)
}

function sheetsJumpFailedLog(ctx: DispatchHostContext): string {
  return tSearch("search.sheets.jumpFailed", ctx.uiLocale ?? DEFAULT_UI_LOCALE)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function tabStillOpen(tabId: number): Promise<boolean> {
  try {
    await chrome.tabs.get(tabId)
    return true
  } catch {
    return false
  }
}


async function activateOpenTab(resolved: OpenTabResolution): Promise<void> {
  await executePickerFocusPlan({
    kind: "activateTab",
    tabId: resolved.tabId,
    windowId: resolved.windowId
  })
  await sleep(TAB_FOCUS_DELAY_MS)
}

async function scrollToMatchInTab(
  tabId: number,
  match: SearchPageMatch,
  pageMatchIndex: number,
  matches: SearchPageMatch[] | undefined,
  searchPattern: string,
  tabUrl?: string
): Promise<boolean> {
  const cellRef = match.cellRef?.trim()
  if (cellRef && tabUrl && isGoogleSheetsUrl(tabUrl)) {
    return navigateSheetsTabToCell(tabId, tabUrl, {
      cellRef,
      cellValue: match.cellValue ?? match.snippet,
      preferFind: match.sheetsRowTrusted !== true
    })
  }
  const needle = searchPattern.trim()
  if (!needle) {
    return false
  }
  const lineHitIndex = lineHitIndexForPageMatch(matches, pageMatchIndex)
  return scrollSearchPageToNeedle(tabId, {
    searchNeedle: needle,
    lineNo: match.lineNo,
    snippetHint: match.snippet,
    globalOccurrence: match.globalOccurrence,
    lineHitIndex: lineHitIndex >= 0 ? lineHitIndex : undefined
  })
}

async function waitForTabComplete(tabId: number): Promise<boolean> {
  try {
    const tab = await chrome.tabs.get(tabId)
    if (tab.status === "complete") {
      return true
    }
  } catch {
    return false
  }

  return new Promise((resolve) => {
    const deadline = Date.now() + TAB_LOAD_TIMEOUT_MS
    const onUpdated = (updatedTabId: number, info: chrome.tabs.TabChangeInfo) => {
      if (updatedTabId !== tabId || info.status !== "complete") {
        return
      }
      chrome.tabs.onUpdated.removeListener(onUpdated)
      resolve(true)
    }
    chrome.tabs.onUpdated.addListener(onUpdated)
    setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(onUpdated)
      resolve(false)
    }, Math.max(0, deadline - Date.now()))
  })
}

async function createTabAndJumpToNeedle(
  entry: PickerEntry,
  match: SearchPageMatch,
  pageMatchIndex: number,
  searchPattern: string
): Promise<boolean> {
  const url = normalizePickerOpenUrl(entry.url)
  if (!url || !isScriptablePageUrl(url)) {
    return false
  }
  // EN: Sheets — open directly on the cell range when we have an A1 ref.
  // JA: Sheets — A1 があるときはセル range 付き URL で開く。
  let openUrl = url
  if (match.cellRef && isGoogleSheetsUrl(url)) {
    const parts = parseGoogleSheetsUrl(url)
    if (parts) {
      const ranged = buildGoogleSheetsCellUrl(parts, match.cellRef)
      if (ranged) {
        openUrl = ranged
      }
    }
  }
  const tab = await createTabInNormalBrowserWindow(openUrl)
  if (!tab || tab.id == null || tab.windowId == null) {
    return false
  }
  await waitForTabComplete(tab.id)
  await sleep(TAB_FOCUS_DELAY_MS + 200)
  await activateOpenTab({ tabId: tab.id, windowId: tab.windowId })
  if (match.cellRef && isGoogleSheetsUrl(url)) {
    return true
  }
  return scrollToMatchInTab(
    tab.id,
    match,
    pageMatchIndex,
    entry.pageMatches,
    searchPattern,
    url
  )
}

/**
 * EN: Open/focus a search picker row — when the URL is already open, activate that tab
 *     and its browser window (never duplicate in the BMXt window). Try in-page scroll when possible.
 * JA: search ピッカー行を開く。URL が既に開いていればそのタブとブラウザウィンドウを前面化し、
 *     可能ならページ内スクロールする（BMXt ウィンドウに重複オープンしない）。
 */
export async function openSearchPickerEntry(
  entry: PickerEntry,
  matchIndex: number,
  ctx: DispatchHostContext,
  appendLogLines: (lines: string[]) => void | Promise<void>,
  searchPattern = "",
  destination?: SearchOpenDestinationRow
): Promise<void> {
  if (destination) {
    try {
      const logLines = await openUrlAtSearchDestination(
        entry.url,
        destination,
        ctx.uiLocale ?? DEFAULT_UI_LOCALE
      )
      if (logLines.length > 0) {
        await appendLogLines(logLines)
      }
    } catch (e) {
      await appendLogLines([`error: ${e instanceof Error ? e.message : String(e)}`])
    }
    return
  }

  const { match, pageMatchIndex } = resolveSearchPickerPageMatch(entry, matchIndex)
  const needle = searchPattern.trim()
  const resolved = await resolveOpenTabForSearchEntry(entry)

  if (resolved && (await tabStillOpen(resolved.tabId))) {
    await activateOpenTab(resolved)
    if (match && (needle || match.cellRef)) {
      const scrolled = await scrollToMatchInTab(
        resolved.tabId,
        match,
        pageMatchIndex,
        entry.pageMatches,
        needle,
        entry.url
      )
      if (!scrolled && match.lineNo > 0) {
        const failLog =
          match.cellRef && isGoogleSheetsUrl(entry.url)
            ? sheetsJumpFailedLog(ctx)
            : scrollFailedLog(ctx)
        await appendLogLines([failLog])
      }
    }
    return
  }

  if (match && (needle || match.cellRef) && match.lineNo > 0) {
    const jumped = await createTabAndJumpToNeedle(entry, match, pageMatchIndex, needle)
    if (jumped) {
      return
    }
    const failLog =
      match.cellRef && isGoogleSheetsUrl(entry.url)
        ? sheetsJumpFailedLog(ctx)
        : scrollFailedLog(ctx)
    await appendLogLines([failLog])
    return
  }

  const effects: HostEffect[] = openEntryEffects(entry, "new_tab")
  if (effects.length === 0) {
    return
  }
  try {
    const logLines = await applyHostEffects(ctx, effects)
    if (logLines.length > 0) {
      await appendLogLines(logLines)
    }
  } catch (e) {
    await appendLogLines([`error: ${e instanceof Error ? e.message : String(e)}`])
  }
}
