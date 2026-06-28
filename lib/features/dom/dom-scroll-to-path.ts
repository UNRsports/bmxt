import {
  runDomClearHighlightOnTab,
  runDomScrollToPathOnTab
} from "../page-dom/run-dom-in-page"
import { executePickerFocusPlan } from "../side-picker/model/focus-picker-entry"
import { isScriptablePageUrl } from "../url/is-scriptable-page-url"

const TAB_FOCUS_DELAY_MS = 120

export type DomListJumpOptions = {
  /** EN: Activate the tab and focus its browser window before scrolling. */
  focusWindow?: boolean
  /** EN: Keep outline on the element until the next preview or clear. */
  persistHighlight?: boolean
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

/**
 * EN: Scroll the target tab to a DOM tree path and briefly outline the element.
 * JA: 対象タブで path の要素へスクロールし、短時間アウトライン表示する。
 */
export async function jumpDomListTargetToPath(
  tabId: number,
  path: readonly number[],
  options: DomListJumpOptions = {}
): Promise<boolean> {
  try {
    const tab = await chrome.tabs.get(tabId)
    if (!isScriptablePageUrl(tab.url)) {
      return false
    }
    if (options.focusWindow && tab.windowId !== undefined) {
      await executePickerFocusPlan({
        kind: "activateTab",
        tabId,
        windowId: tab.windowId
      })
      await sleep(TAB_FOCUS_DELAY_MS)
    }
    return runDomScrollToPathOnTab(tabId, path, options.persistHighlight === true)
  } catch {
    return false
  }
}

/** EN: Preview jump — scroll/highlight without focusing the browser window. */
export async function previewDomListTargetToPath(
  tabId: number,
  path: readonly number[]
): Promise<boolean> {
  return jumpDomListTargetToPath(tabId, path, { focusWindow: false, persistHighlight: true })
}

/** EN: Legacy alias for previewDomListTargetToPath. */
export async function scrollDomListTargetToPath(
  tabId: number,
  path: readonly number[]
): Promise<boolean> {
  return previewDomListTargetToPath(tabId, path)
}

/** EN: Remove persisted dom picker outline on the target tab. */
export async function clearDomListTargetHighlight(tabId: number): Promise<void> {
  try {
    const tab = await chrome.tabs.get(tabId)
    if (!isScriptablePageUrl(tab.url)) {
      return
    }
    await runDomClearHighlightOnTab(tabId)
  } catch {
    /* tab gone or not scriptable */
  }
}
