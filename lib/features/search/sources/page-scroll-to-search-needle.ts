import { bmxtScrollToSearchNeedleInjected } from "../../page-dom/injected-scroll-to-search-needle"
import {
  PAGE_SCROLL_NEEDLE_CHANNEL,
  type BmxtNeedleHighlightColorsPayload,
  type PageScrollNeedleRequest,
  type PageScrollNeedleResponse
} from "../../page-dom/page-scroll-needle-message"
import { isScriptablePageUrl } from "../../url/is-scriptable-page-url"

export type ScrollSearchPageToNeedleOptions = {
  searchNeedle: string
  lineNo?: number
  snippetHint?: string
  globalOccurrence?: number
  /** EN: 0-based hit index on `lineNo` when the line has multiple needle matches. */
  lineHitIndex?: number
  /** EN: Auto-clear after ms; 0 keeps until explicit clear. */
  persistMs?: number
  highlightColors?: BmxtNeedleHighlightColorsPayload
  /** EN: Only update jump highlight + scroll. */
  activeOnly?: boolean
}

const SCROLL_RETRY_DELAY_MS = 180

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function buildScrollRequest(options: ScrollSearchPageToNeedleOptions): PageScrollNeedleRequest {
  const request: PageScrollNeedleRequest = {
    channel: PAGE_SCROLL_NEEDLE_CHANNEL,
    searchNeedle: options.searchNeedle.trim(),
    lineNo: options.lineNo ?? 0,
    snippetHint: options.snippetHint ?? ""
  }
  if (options.globalOccurrence !== undefined && options.globalOccurrence >= 0) {
    request.globalOccurrence = options.globalOccurrence
  }
  if (options.lineHitIndex !== undefined && options.lineHitIndex >= 0) {
    request.lineHitIndex = options.lineHitIndex
  }
  if (options.highlightColors) {
    request.highlightColors = options.highlightColors
  }
  if (options.activeOnly) {
    request.activeOnly = true
  }
  if (options.persistMs !== undefined) {
    request.persistMs = options.persistMs
  }
  return request
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
  const colors = request.highlightColors
  const hitBg = colors?.hitBg ?? "#ffc9dd"
  const jumpBg = colors?.jumpBg ?? "#ffdb4d"
  const fg = colors?.fg ?? "#0d1117"
  const persistMs = request.persistMs ?? 0
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: bmxtScrollToSearchNeedleInjected,
      args: [
        request.searchNeedle,
        request.lineNo,
        request.snippetHint,
        persistMs,
        request.globalOccurrence ?? -1,
        hitBg,
        jumpBg,
        fg,
        request.activeOnly ?? false,
        request.lineHitIndex ?? -1
      ]
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
