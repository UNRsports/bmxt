import { bmxtFindPageScrollToSnippetInjected } from "../../page-dom/injected-find-page-scroll-to-snippet"
import { resolveNeedleHighlightColors } from "../../page-dom/page-scroll-needle-message"
import {
  PAGE_SCROLL_SNIPPET_CHANNEL,
  type PageScrollSnippetRequest,
  type PageScrollSnippetResponse
} from "../../page-dom/page-scroll-snippet-message"
import { isScriptablePageUrl } from "../../url/is-scriptable-page-url"

const SCROLL_RETRY_DELAY_MS = 180

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function scrollViaContentScript(
  tabId: number,
  request: PageScrollSnippetRequest
): Promise<boolean> {
  try {
    const result = await chrome.tabs.sendMessage<PageScrollSnippetRequest, PageScrollSnippetResponse>(
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
  request: PageScrollSnippetRequest,
  persistMs: number,
  highlightColors?: { hitBg: string; jumpBg: string; fg: string }
): Promise<boolean> {
  const colors = resolveNeedleHighlightColors(highlightColors)
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: bmxtFindPageScrollToSnippetInjected,
      args: [request.snippet, request.occurrence, persistMs, colors.jumpBg, colors.fg]
    })
    return Boolean((result as PageScrollSnippetResponse | undefined)?.ok)
  } catch {
    return false
  }
}

/** EN: Scroll/highlight in tab — content script first, then `executeScript` fallback. */
export async function scrollSearchPageToSnippet(
  tabId: number,
  snippet: string,
  occurrence = 0,
  persistMs = 0,
  highlightColors?: { hitBg: string; jumpBg: string; fg: string }
): Promise<boolean> {
  const trimmed = snippet.trim()
  if (!trimmed) {
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

  const request: PageScrollSnippetRequest = {
    channel: PAGE_SCROLL_SNIPPET_CHANNEL,
    snippet: trimmed,
    occurrence
  }
  if (await scrollViaContentScript(tabId, request)) {
    return true
  }
  await sleep(SCROLL_RETRY_DELAY_MS)
  if (await scrollViaContentScript(tabId, request)) {
    return true
  }
  if (await scrollViaExecuteScript(tabId, request, persistMs, highlightColors)) {
    return true
  }
  await sleep(SCROLL_RETRY_DELAY_MS)
  return scrollViaExecuteScript(tabId, request, persistMs, highlightColors)
}
