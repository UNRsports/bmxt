import { scrollFindPageToSnippet } from "../find-sources/page-scroll-to-snippet"
import { executePickerFocusPlan } from "../side-picker/model/focus-picker-entry"
import { openEntryEffects } from "../side-picker/model/open-entry"
import type { PickerEntry } from "../side-picker/model/picker-entry"
import type { ChromeEffect } from "../dispatch/effect-types"
import type { DispatchChromeContext } from "../dispatch/dispatch-context"
import { applyChromeEffects } from "../dispatch"

async function tabStillOpen(tabId: number): Promise<boolean> {
  try {
    await chrome.tabs.get(tabId)
    return true
  } catch {
    return false
  }
}

/**
 * EN: Open/focus a find picker row — page hits activate the source tab and scroll to the match.
 * JA: find ピッカー行を開く。page は元タブを前面にし該当箇所へスクロールする。
 */
export async function openFindPickerEntry(
  entry: PickerEntry,
  matchIndex: number,
  ctx: DispatchChromeContext,
  appendLogLines: (lines: string[]) => void | Promise<void>
): Promise<void> {
  const match = entry.pageMatches?.[matchIndex] ?? entry.pageMatches?.[0]
  if (entry.source === "page" && entry.tabId != null && entry.windowId != null && match) {
    if (await tabStillOpen(entry.tabId)) {
      await executePickerFocusPlan({
        kind: "activateTab",
        tabId: entry.tabId,
        windowId: entry.windowId
      })
      const scrolled = await scrollFindPageToSnippet(
        entry.tabId,
        match.snippet,
        match.occurrence
      )
      if (!scrolled) {
        await appendLogLines([
          "find — could not scroll to match (reload the tab or grant site access, then try again)"
        ])
      }
      return
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
