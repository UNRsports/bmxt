import { bmxtScrollToSearchNeedleInjected } from "../../page-dom/injected-scroll-to-search-needle"
import {
  PAGE_SCROLL_NEEDLE_CHANNEL,
  type PageScrollNeedleRequest,
  type PageScrollNeedleResponse
} from "../../page-dom/page-scroll-needle-message"
import { isScriptablePageUrl } from "../../url/is-scriptable-page-url"

export type ScrollSearchPageToNeedleOptions = {
  searchNeedle: string
  lineNo?: number
  snippetHint?: string
}

const SCROLL_RETRY_DELAY_MS = 180

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function buildScrollRequest(options: ScrollSearchPageToNeedleOptions): PageScrollNeedleRequest {
  return {
    channel: PAGE_SCROLL_NEEDLE_CHANNEL,
    searchNeedle: options.searchNeedle.trim(),
    lineNo: options.lineNo ?? 0,
    snippetHint: options.snippetHint ?? ""
  }
}

async function scrollViaContentScript(
  tabId: number,
  request: PageScrollNeedleRequest
): Promise<boolean> {
  try {
    const result = await chrome.tabs.sendMessage<PageScrollNeedleRequest, PageScrollNeedleResponse>(
      tabId,
      request
    )
    return Boolean(result?.ok)
  } catch {
    return false
  }
}

async function scrollViaExecuteScript(
  tabId: number,
  request: PageScrollNeedleRequest
): Promise<boolean> {
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: bmxtScrollToSearchNeedleInjected,
      args: [request.searchNeedle, request.lineNo, request.snippetHint]
    })
    return Boolean((result as PageScrollNeedleResponse | undefined)?.ok)
  } catch {
    return false
  }
}

/** EN: Scroll/highlight in tab — content script first, then `executeScript` fallback. */
export async function scrollSearchPageToNeedle(
  tabId: number,
  options: ScrollSearchPageToNeedleOptions
): Promise<boolean> {
  const searchNeedle = options.searchNeedle.trim()
  if (!searchNeedle) {
    return false
  }
  try {
    const tab = await chrome.tabs.get(tabId)
    if (!isScriptablePageUrl(tab.url)) {
      return false
    }
  } catch {
    return false
  }

  const request = buildScrollRequest(options)
  if (await scrollViaContentScript(tabId, request)) {
    return true
  }
  await sleep(SCROLL_RETRY_DELAY_MS)
  if (await scrollViaContentScript(tabId, request)) {
    return true
  }
  if (await scrollViaExecuteScript(tabId, request)) {
    return true
  }
  await sleep(SCROLL_RETRY_DELAY_MS)
  return scrollViaExecuteScript(tabId, request)
}
