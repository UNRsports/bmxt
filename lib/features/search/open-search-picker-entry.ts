import { createTabInNormalBrowserWindow } from "../dispatch/handlers/shared"
import { resolveSearchPickerPageMatch, lineHitIndexForPageMatch } from "./search-picker-page-match"
import { scrollSearchPageToNeedle } from "./sources/page-scroll-to-search-needle"
import { executePickerFocusPlan } from "../side-picker/model/focus-picker-entry"
import { openEntryEffects } from "../side-picker/model/open-entry"
import { normalizePickerOpenUrl } from "../side-picker/model/normalize-picker-open-url"
import type { PickerEntry, SearchPageMatch } from "../side-picker/model/picker-entry"
import { isScriptablePageUrl } from "../url/is-scriptable-page-url"
import {
  resolveOpenTabForSearchEntry,
  type OpenTabResolution
} from "./search-entry-open-tab"
import {
  openUrlAtSearchDestination,
  type SearchOpenDestinationRow
} from "./search-open-destination"
import type { ChromeEffect } from "../dispatch/effect-types"
import type { DispatchChromeContext } from "../dispatch/dispatch-context"
import { applyChromeEffects } from "../dispatch"
import { t } from "../setting/i18n/messages"
import { DEFAULT_UI_LOCALE } from "../setting/locale"

const TAB_FOCUS_DELAY_MS = 120
const TAB_LOAD_TIMEOUT_MS = 20000

function scrollFailedLog(ctx: DispatchChromeContext): string {
  return t("search.scrollToMatch.failed", ctx.uiLocale ?? DEFAULT_UI_LOCALE)
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
  searchPattern: string
): Promise<boolean> {
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
  const tab = await createTabInNormalBrowserWindow(url)
  if (!tab || tab.id == null || tab.windowId == null) {
    return false
  }
  await waitForTabComplete(tab.id)
  await sleep(TAB_FOCUS_DELAY_MS + 200)
  await activateOpenTab({ tabId: tab.id, windowId: tab.windowId })
  return scrollToMatchInTab(tab.id, match, pageMatchIndex, entry.pageMatches, searchPattern)
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
  ctx: DispatchChromeContext,
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
    if (match && needle) {
      const scrolled = await scrollToMatchInTab(
        resolved.tabId,
        match,
        pageMatchIndex,
        entry.pageMatches,
        needle
      )
      if (!scrolled && match.lineNo > 0) {
        await appendLogLines([scrollFailedLog(ctx)])
      }
    }
    return
  }

  if (match && needle && match.lineNo > 0) {
    const jumped = await createTabAndJumpToNeedle(entry, match, pageMatchIndex, needle)
    if (jumped) {
      return
    }
    await appendLogLines([scrollFailedLog(ctx)])
    return
  }

  const effects: ChromeEffect[] = openEntryEffects(entry, "new_tab")
  if (effects.length === 0) {
    return
  }
  try {
    const logLines = await applyChromeEffects(ctx, effects)
    if (logLines.length > 0) {
      await appendLogLines(logLines)
    }
  } catch (e) {
    await appendLogLines([`error: ${e instanceof Error ? e.message : String(e)}`])
  }
}
