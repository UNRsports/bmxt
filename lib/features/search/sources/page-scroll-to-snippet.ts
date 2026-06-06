import { bmxtFindPageScrollToSnippetInjected } from "../../page-dom/injected-find-page-scroll-to-snippet"
import { isScriptablePageUrl } from "../../url/is-scriptable-page-url"

/** EN: Focus tab and scroll to the Nth in-page occurrence of `snippet` (case-insensitive). */
export async function scrollSearchPageToSnippet(
  tabId: number,
  snippet: string,
  occurrence = 0
): Promise<boolean> {
  try {
    const tab = await chrome.tabs.get(tabId)
    if (!isScriptablePageUrl(tab.url)) {
      return false
    }
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: bmxtFindPageScrollToSnippetInjected,
      args: [snippet, occurrence]
    })
    return Boolean((result as { ok?: boolean } | undefined)?.ok)
  } catch {
    return false
  }
}
