/**
 * EN: Plasmo content script — nav overlay listener on http(s) pages.
 * JA: 常駐 CS。BMXt タブ UI からの sendMessage を受け、オーバーレイを操作する。
 */

import type { PlasmoCSConfig } from "plasmo"
import {
  bmxtExtractPageInnerTextInPage,
  isPageExtractRequest
} from "../lib/features/page-extract/page-extract-message"
import { bmxtScrollToSearchNeedleInjected } from "../lib/features/page-dom/injected-scroll-to-search-needle"
import { isPageScrollNeedleRequest } from "../lib/features/page-dom/page-scroll-needle-message"
import {
  bmxtNavControlInjected,
  NAV_OVERLAY_CHANNEL,
  type NavOverlayMessage
} from "../lib/features/nav/nav-overlay-inject-fn"

export const config: PlasmoCSConfig = {
  matches: ["https://*/*", "http://*/*"],
  all_frames: false,
  run_at: "document_idle"
}

chrome.runtime.onMessage.addListener((raw, _sender, sendResponse) => {
  if (isPageExtractRequest(raw)) {
    sendResponse(bmxtExtractPageInnerTextInPage(raw.maxChars))
    return true
  }
  if (isPageScrollNeedleRequest(raw)) {
    sendResponse(
      bmxtScrollToSearchNeedleInjected(
        raw.searchNeedle,
        raw.lineNo,
        raw.snippetHint,
        8000,
        raw.globalOccurrence ?? -1
      )
    )
    return true
  }
  const msg = raw as NavOverlayMessage
  if (!msg || msg.channel !== NAV_OVERLAY_CHANNEL) {
    return false
  }
  const result = bmxtNavControlInjected(
    msg.action,
    msg.useCenter ? 1 : 0,
    msg.x,
    msg.y,
    msg.dx,
    msg.dy,
    msg.key ?? "",
    msg.code ?? "",
    msg.ctrlKey ? 1 : 0,
    msg.shiftKey ? 1 : 0,
    msg.altKey ? 1 : 0,
    msg.metaKey ? 1 : 0,
    msg.text ?? ""
  )
  sendResponse(result)
  return true
})
