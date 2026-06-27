import { bmxtDomScrollToPathInjected } from "../page-dom/injected-dom-scroll-to-path"
import { executePickerFocusPlan } from "../side-picker/model/focus-picker-entry"
import { isScriptablePageUrl } from "../url/is-scriptable-page-url"

const TAB_FOCUS_DELAY_MS = 120

export type DomListJumpOptions = {
  /** EN: Activate the tab and focus its browser window before scrolling. */
  focusWindow?: boolean
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

async function injectScrollToPath(tabId: number, path: readonly number[]): Promise<boolean> {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: bmxtDomScrollToPathInjected,
    args: [[...path]]
  })
  return Boolean((result as { ok?: boolean } | undefined)?.ok)
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
    return injectScrollToPath(tabId, path)
  } catch {
    return false
  }
}

/** EN: Preview jump — scroll/highlight without focusing the browser window. */
export async function scrollDomListTargetToPath(
  tabId: number,
  path: readonly number[]
): Promise<boolean> {
  return jumpDomListTargetToPath(tabId, path, { focusWindow: false })
}
