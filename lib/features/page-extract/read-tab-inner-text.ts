import { ensurePageContentScript } from "../page-scripting/ensure-content-script"
import {
  bmxtExtractPageInnerTextInPage,
  bmxtProbePageInnerTextLengthInPage,
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

async function readViaContentScript(
  tabId: number,
  msg: PageExtractRequest
): Promise<string | number | null> {
  try {
    const value = await withTimeout(
      chrome.tabs.sendMessage<PageExtractRequest, string | number>(tabId, msg),
      TAB_READ_TIMEOUT_MS
    )
    if (value === "timeout") {
      return null
    }
    if (typeof value === "string" || typeof value === "number") {
      return value
    }
  } catch {
    /* content script not loaded on this tab */
  }
  return null
}

/**
 * EN: Prefer the registered content script (ensure/re-inject without page reload);
 *     fall back to `executeScript` when host access allows.
 * JA: 常駐 CS を優先（ensure でページ非リロード再注入）。タイムアウト付き。
 */
export async function readTabInnerText(tabId: number, maxChars: number): Promise<string | null> {
  const msg: PageExtractRequest = {
    channel: PAGE_EXTRACT_CHANNEL,
    maxChars: maxChars
  }
  const first = await readViaContentScript(tabId, msg)
  if (typeof first === "string") {
    return first
  }
  if (await ensurePageContentScript(tabId)) {
    const second = await readViaContentScript(tabId, msg)
    if (typeof second === "string") {
      return second
    }
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

async function readTabInnerTextLength(tabId: number): Promise<number | null> {
  const msg: PageExtractRequest = {
    channel: PAGE_EXTRACT_CHANNEL,
    maxChars: 0,
    lengthOnly: true
  }
  const first = await readViaContentScript(tabId, msg)
  if (typeof first === "number") {
    return first
  }
  if (await ensurePageContentScript(tabId)) {
    const second = await readViaContentScript(tabId, msg)
    if (typeof second === "number") {
      return second
    }
  }
  try {
    const results = await withTimeout(
      chrome.scripting.executeScript({
        target: { tabId },
        func: bmxtProbePageInnerTextLengthInPage,
        args: []
      }),
      TAB_READ_TIMEOUT_MS
    )
    if (results !== "timeout" && results?.[0]?.result != null && typeof results[0].result === "number") {
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

/** EN: innerText length for one open tab without reading body text into the SW. */
export async function probeOpenTabInnerTextLength(tab: chrome.tabs.Tab): Promise<number | null> {
  const tabId = tab.id
  if (tabId === undefined) {
    return null
  }
  return readTabInnerTextLength(tabId)
}
