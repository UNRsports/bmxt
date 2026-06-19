import {
  bmxtExtractPageInnerTextInPage,
  PAGE_EXTRACT_CHANNEL,
  type PageExtractRequest
} from "./page-extract-message"

const TAB_READ_TIMEOUT_MS = 2500

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | "timeout"> {
  return Promise.race([
    promise.then((v) => v as T | "timeout"),
    new Promise<"timeout">((resolve) => {
      setTimeout(() => resolve("timeout"), ms)
    })
  ])
}

/**
 * EN: Prefer the registered content script (works with chrome://extensions “On all sites”);
 *     fall back to `executeScript` when optional host permission is granted.
 * JA: 常駐 CS を優先。タイムアウト付き（ハングで find 全体が無応答にならないようにする）。
 */
export async function readTabInnerText(tabId: number, maxChars: number): Promise<string | null> {
  const msg: PageExtractRequest = {
    channel: PAGE_EXTRACT_CHANNEL,
    maxChars: maxChars
  }
  try {
    const text = await withTimeout(
      chrome.tabs.sendMessage<PageExtractRequest, string>(tabId, msg),
      TAB_READ_TIMEOUT_MS
    )
    if (text !== "timeout" && typeof text === "string") {
      return text
    }
  } catch {
    /* content script not loaded on this tab */
  }
  try {
    const results = await withTimeout(
      chrome.scripting.executeScript({
        target: { tabId },
        func: bmxtExtractPageInnerTextInPage,
        args: [maxChars]
      }),
      TAB_READ_TIMEOUT_MS
    )
    if (results !== "timeout" && results?.[0]?.result != null && typeof results[0].result === "string") {
      return results[0].result
    }
  } catch {
    /* host permission or Chrome-blocked page */
  }
  return null
}

/** EN: Live read for one open tab — no SQLite / storage cache. */
export async function readOpenTabInnerText(
  tab: chrome.tabs.Tab,
  maxChars: number
): Promise<string | null> {
  const tabId = tab.id
  if (tabId === undefined) {
    return null
  }
  return readTabInnerText(tabId, maxChars)
}
