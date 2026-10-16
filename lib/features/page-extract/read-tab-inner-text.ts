/**
 * EN: Read tab `innerText` for search / page extract.
 *     With required http(s) `host_permissions`, prefer timed `executeScript({ func })`.
 *     Content-script messaging is a fallback only when scripting fails fast (not on
 *     timeout) — a hung CS / frozen tab must not be double-attempted, or bulk
 *     `search -list --page` / `--all` stalls.
 * JA: 必須 host_permissions 下では timed `executeScript({ func })` を優先。
 *     CS は「即失敗」時のみフォールバック。タイムアウト後に二重試行しない
 *     （凍ったタブで検索全体が止まらないようにする）。
 */

import { clampPageExtractMaxChars } from "./page-extract-limits"
import {
  bmxtExtractPageInnerTextInPage,
  bmxtProbePageInnerTextLengthInPage,
  PAGE_EXTRACT_CHANNEL,
  type PageExtractRequest
} from "./page-extract-message"

/** EN: Per-attempt budget for one chrome.* call (CS or executeScript). */
const TAB_READ_ATTEMPT_MS = 1200

type Timed<T> = { status: "ok"; value: T } | { status: "timeout" } | { status: "fail" }

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<Timed<T>> {
  return new Promise((resolve) => {
    let settled = false
    const timer = setTimeout(() => {
      if (settled) {
        return
      }
      settled = true
      resolve({ status: "timeout" })
    }, ms)
    promise.then(
      (value) => {
        if (settled) {
          return
        }
        settled = true
        clearTimeout(timer)
        resolve({ status: "ok", value })
      },
      () => {
        if (settled) {
          return
        }
        settled = true
        clearTimeout(timer)
        resolve({ status: "fail" })
      }
    )
  })
}

async function extractViaExecuteScript(
  tabId: number,
  maxChars: number
): Promise<Timed<string>> {
  const timed = await withTimeout(
    chrome.scripting.executeScript({
      target: { tabId },
      func: bmxtExtractPageInnerTextInPage,
      args: [maxChars]
    }),
    TAB_READ_ATTEMPT_MS
  )
  if (timed.status !== "ok") {
    return timed
  }
  const result = timed.value?.[0]?.result
  if (typeof result === "string") {
    return { status: "ok", value: result }
  }
  return { status: "fail" }
}

async function extractViaContentScript(
  tabId: number,
  maxChars: number
): Promise<Timed<string>> {
  const msg: PageExtractRequest = {
    channel: PAGE_EXTRACT_CHANNEL,
    maxChars
  }
  const timed = await withTimeout(
    chrome.tabs.sendMessage<PageExtractRequest, string>(tabId, msg),
    TAB_READ_ATTEMPT_MS
  )
  if (timed.status !== "ok") {
    return timed
  }
  if (typeof timed.value === "string") {
    return { status: "ok", value: timed.value }
  }
  return { status: "fail" }
}

async function probeLengthViaExecuteScript(tabId: number): Promise<Timed<number>> {
  const timed = await withTimeout(
    chrome.scripting.executeScript({
      target: { tabId },
      func: bmxtProbePageInnerTextLengthInPage,
      args: []
    }),
    TAB_READ_ATTEMPT_MS
  )
  if (timed.status !== "ok") {
    return timed
  }
  const result = timed.value?.[0]?.result
  if (typeof result === "number") {
    return { status: "ok", value: result }
  }
  return { status: "fail" }
}

async function probeLengthViaContentScript(tabId: number): Promise<Timed<number>> {
  const msg: PageExtractRequest = {
    channel: PAGE_EXTRACT_CHANNEL,
    maxChars: 0,
    lengthOnly: true
  }
  const timed = await withTimeout(
    chrome.tabs.sendMessage<PageExtractRequest, number>(tabId, msg),
    TAB_READ_ATTEMPT_MS
  )
  if (timed.status !== "ok") {
    return timed
  }
  if (typeof timed.value === "number") {
    return { status: "ok", value: timed.value }
  }
  return { status: "fail" }
}

/**
 * EN: Prefer scripting (host_permissions); CS only after a fast scripting failure.
 *     After any timeout, give up on this tab — do not stack another chrome.* call.
 * JA: scripting 優先。即失敗時のみ CS。タイムアウト後は当該タブを打ち切る。
 */
export async function readTabInnerText(tabId: number, maxChars: number): Promise<string | null> {
  const capped = clampPageExtractMaxChars(maxChars)

  const viaScript = await extractViaExecuteScript(tabId, capped)
  if (viaScript.status === "ok") {
    return viaScript.value
  }
  if (viaScript.status === "timeout") {
    return null
  }

  const viaCs = await extractViaContentScript(tabId, capped)
  if (viaCs.status === "ok") {
    return viaCs.value
  }
  return null
}

async function readTabInnerTextLength(tabId: number): Promise<number | null> {
  const viaScript = await probeLengthViaExecuteScript(tabId)
  if (viaScript.status === "ok") {
    return viaScript.value
  }
  if (viaScript.status === "timeout") {
    return null
  }

  const viaCs = await probeLengthViaContentScript(tabId)
  if (viaCs.status === "ok") {
    return viaCs.value
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
