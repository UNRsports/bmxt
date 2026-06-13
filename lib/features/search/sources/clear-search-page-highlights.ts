import { bmxtClearSearchNeedleHighlightInjected } from "../../page-dom/injected-clear-search-needle"
import {
  PAGE_CLEAR_NEEDLE_CHANNEL,
  type PageClearNeedleRequest,
  type PageScrollNeedleResponse
} from "../../page-dom/page-scroll-needle-message"
import { isScriptablePageUrl } from "../../url/is-scriptable-page-url"

async function clearViaContentScript(tabId: number): Promise<boolean> {
  const request: PageClearNeedleRequest = { channel: PAGE_CLEAR_NEEDLE_CHANNEL }
  try {
    const result = await chrome.tabs.sendMessage<PageClearNeedleRequest, PageScrollNeedleResponse>(
      tabId,
      request
    )
    return Boolean(result?.ok)
  } catch {
    return false
  }
}

async function clearViaExecuteScript(tabId: number): Promise<boolean> {
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: bmxtClearSearchNeedleHighlightInjected
    })
    return Boolean((result as PageScrollNeedleResponse | undefined)?.ok)
  } catch {
    return false
  }
}

/** EN: Clear in-page search needle highlights for a tab. */
export async function clearSearchPageHighlights(tabId: number): Promise<boolean> {
  try {
    const tab = await chrome.tabs.get(tabId)
    if (!isScriptablePageUrl(tab.url)) {
      return false
    }
  } catch {
    return false
  }
  if (await clearViaContentScript(tabId)) {
    return true
  }
  return clearViaExecuteScript(tabId)
}
