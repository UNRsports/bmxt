import { bmxtDomScrollToPathInjected } from "../page-dom/injected-dom-scroll-to-path"
import { isScriptablePageUrl } from "../url/is-scriptable-page-url"

/** EN: Highlight and scroll the target tab's element for a DOM tree path. */
export async function scrollDomListTargetToPath(
  tabId: number,
  path: readonly number[]
): Promise<boolean> {
  try {
    const tab = await chrome.tabs.get(tabId)
    if (!isScriptablePageUrl(tab.url)) {
      return false
    }
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: bmxtDomScrollToPathInjected,
      args: [[...path]]
    })
    return Boolean((result as { ok?: boolean } | undefined)?.ok)
  } catch {
    return false
  }
}
