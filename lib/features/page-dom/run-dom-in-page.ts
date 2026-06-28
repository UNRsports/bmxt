/** EN: Run dom -list in-page work via the persistent content script (import-safe). */
/** JA: dom -list のページ内処理を常駐 CS 経由で実行（import 付きモジュール可）。 */

import type { DomSemanticKind } from "../dom/dom-semantic-kind.ts"
import { isScriptablePageUrl } from "../url/is-scriptable-page-url.ts"
import {
  DOM_CLEAR_HIGHLIGHT_CHANNEL,
  DOM_SCROLL_TO_PATH_CHANNEL,
  DOM_SEMANTIC_ENTRIES_CHANNEL,
  type DomClearHighlightRequest,
  type DomClearHighlightResponse,
  type DomScrollToPathRequest,
  type DomScrollToPathResponse,
  type DomSemanticEntriesPayload,
  type DomSemanticEntriesRequest
} from "./dom-list-in-page-message.ts"
import type { DomSemanticCaptureScope } from "./injected-dom-semantic-entries.ts"
import type { DomShowMode } from "./injected-dom-show.ts"

const CONTENT_SCRIPT_RETRY_DELAY_MS = 150

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

async function tabUrlOk(tabId: number): Promise<boolean> {
  try {
    const tab = await chrome.tabs.get(tabId)
    return isScriptablePageUrl(tab.url)
  } catch {
    return false
  }
}

async function sendDomInPageMessage<TReq, TRes>(
  tabId: number,
  request: TReq
): Promise<TRes | null> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await chrome.tabs.sendMessage<TReq, TRes>(tabId, request)
      return result
    } catch {
      if (attempt === 0) {
        await sleep(CONTENT_SCRIPT_RETRY_DELAY_MS)
      }
    }
  }
  return null
}

/** EN: Semantic filter — content script only. */
export async function runDomSemanticEntriesOnTab(
  tabId: number,
  mode: DomShowMode,
  kind: DomSemanticKind,
  scope: DomSemanticCaptureScope = "viewport"
): Promise<DomSemanticEntriesPayload | null> {
  if (!(await tabUrlOk(tabId))) {
    return null
  }
  const request: DomSemanticEntriesRequest = {
    channel: DOM_SEMANTIC_ENTRIES_CHANNEL,
    mode,
    kind,
    scope
  }
  return sendDomInPageMessage<DomSemanticEntriesRequest, DomSemanticEntriesPayload>(tabId, request)
}

/** EN: Scroll/highlight a dom tree path — content script only. */
export async function runDomScrollToPathOnTab(
  tabId: number,
  path: readonly number[],
  persistHighlight: boolean
): Promise<boolean> {
  if (!(await tabUrlOk(tabId))) {
    return false
  }
  const request: DomScrollToPathRequest = {
    channel: DOM_SCROLL_TO_PATH_CHANNEL,
    path: [...path],
    persist: persistHighlight
  }
  const result = await sendDomInPageMessage<DomScrollToPathRequest, DomScrollToPathResponse>(
    tabId,
    request
  )
  return Boolean(result?.ok)
}

/** EN: Clear persisted dom picker outline — content script only. */
export async function runDomClearHighlightOnTab(tabId: number): Promise<void> {
  if (!(await tabUrlOk(tabId))) {
    return
  }
  const request: DomClearHighlightRequest = { channel: DOM_CLEAR_HIGHLIGHT_CHANNEL }
  await sendDomInPageMessage<DomClearHighlightRequest, DomClearHighlightResponse>(tabId, request)
}
