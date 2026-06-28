import { bmxtDomPageScrollInjected } from "../page-dom/injected-dom-page-scroll.ts"
import { isScriptablePageUrl } from "../url/is-scriptable-page-url.ts"

const PAGE_SCROLL_STEP_PX = 120

/** EN: Scroll the target tab page up/down (used by `--with` picker mode). */
export async function scrollDomListTargetPage(
  tabId: number,
  direction: 1 | -1
): Promise<boolean> {
  try {
    const tab = await chrome.tabs.get(tabId)
    if (!isScriptablePageUrl(tab.url)) {
      return false
    }
    const deltaY = direction * PAGE_SCROLL_STEP_PX
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: bmxtDomPageScrollInjected,
      args: [deltaY]
    })
    return Boolean((result as { ok?: boolean } | undefined)?.ok)
  } catch {
    return false
  }
}
