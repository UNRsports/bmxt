import { scrollSearchPageToNeedle } from "./sources/page-scroll-to-search-needle"
import { executePickerFocusPlan } from "../side-picker/model/focus-picker-entry"
import { normalizePickerOpenUrl } from "../side-picker/model/normalize-picker-open-url"
import { openEntryEffects } from "../side-picker/model/open-entry"
import type { PickerEntry, SearchPageMatch } from "../side-picker/model/picker-entry"
import { isHttpUrl } from "../url/is-http-url"
import { isScriptablePageUrl } from "../url/is-scriptable-page-url"
import { normalizeUrlForSearchDedup } from "./search-url-dedup"
import type { ChromeEffect } from "../dispatch/effect-types"
import type { DispatchChromeContext } from "../dispatch/dispatch-context"
import { applyChromeEffects } from "../dispatch"

const TAB_FOCUS_DELAY_MS = 120
const TAB_LOAD_TIMEOUT_MS = 20000

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

function pickPageMatch(entry: PickerEntry, matchIndex: number): SearchPageMatch | undefined {
  const matches = entry.pageMatches
  if (!matches || matches.length === 0) {
    return undefined
  }
  return matches[matchIndex] ?? matches[0]
}

/** EN: Resolve an open http(s) tab for this entry (stored tabId or URL match). */
async function resolveOpenTabForEntry(
  entry: PickerEntry
): Promise<{ tabId: number; windowId: number } | null> {
  if (entry.tabId != null) {
    try {
      const tab = await chrome.tabs.get(entry.tabId)
      if (
        !tab.discarded &&
        tab.id != null &&
        tab.windowId != null &&
        isScriptablePageUrl(tab.url)
      ) {
        return { tabId: tab.id, windowId: tab.windowId }
      }
    } catch {
      /* fall through to URL lookup */
    }
  }

  const targetKey = normalizeUrlForSearchDedup(entry.url)
  const tabs = await chrome.tabs.query({})
  for (const tab of tabs) {
    if (tab.discarded || tab.id == null || tab.windowId == null || !isHttpUrl(tab.url)) {
      continue
    }
    if (normalizeUrlForSearchDedup(tab.url) === targetKey && isScriptablePageUrl(tab.url)) {
      return { tabId: tab.id, windowId: tab.windowId }
    }
  }
  return null
}

async function jumpToNeedleInTab(
  tabId: number,
  windowId: number,
  match: SearchPageMatch,
  searchPattern: string
): Promise<boolean> {
  const needle = searchPattern.trim()
  if (!needle) {
    return false
  }
  await executePickerFocusPlan({
    kind: "activateTab",
    tabId,
    windowId
  })
  await sleep(TAB_FOCUS_DELAY_MS)
  return scrollSearchPageToNeedle(tabId, {
    searchNeedle: needle,
    lineNo: match.lineNo,
    snippetHint: match.snippet
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
  searchPattern: string
): Promise<boolean> {
  const url = normalizePickerOpenUrl(entry.url)
  if (!url || !isScriptablePageUrl(url)) {
    return false
  }
  let tab: chrome.tabs.Tab
  try {
    tab = await chrome.tabs.create({ url })
  } catch {
    return false
  }
  if (tab.id == null || tab.windowId == null) {
    return false
  }
  await waitForTabComplete(tab.id)
  await sleep(TAB_FOCUS_DELAY_MS + 200)
  return jumpToNeedleInTab(tab.id, tab.windowId, match, searchPattern)
}

/**
 * EN: Open/focus a search picker row — page hits activate the source tab, scroll to the
 *     search needle, and highlight it in the page.
 * JA: search ピッカー行を開く。page ヒットは元タブを前面にし、検索語へスクロールして強調表示する。
 */
export async function openSearchPickerEntry(
  entry: PickerEntry,
  matchIndex: number,
  ctx: DispatchChromeContext,
  appendLogLines: (lines: string[]) => void | Promise<void>,
  searchPattern = ""
): Promise<void> {
  const match = pickPageMatch(entry, matchIndex)
  const needle = searchPattern.trim()

  if (match && needle) {
    const resolved = await resolveOpenTabForEntry(entry)
    if (resolved && (await tabStillOpen(resolved.tabId))) {
      const jumped = await jumpToNeedleInTab(
        resolved.tabId,
        resolved.windowId,
        match,
        needle
      )
      if (jumped) {
        return
      }
      if (match.lineNo > 0) {
        await appendLogLines([
          "search — could not scroll to match (reload the tab or grant site access, then try again)"
        ])
        return
      }
    }

    if (match.lineNo > 0) {
      const jumped = await createTabAndJumpToNeedle(entry, match, needle)
      if (jumped) {
        return
      }
    }
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
