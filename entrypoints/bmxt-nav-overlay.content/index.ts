/**
 * EN: Content script — nav overlay listener on http(s) pages.
 * JA: 常駐 CS。BMXt タブ UI からの sendMessage を受け、オーバーレイを操作する。
 */

import {
  bmxtExtractPageInnerTextInPage,
  isPageExtractRequest
} from "../../lib/features/page-extract/page-extract-message"
import { bmxtFindPageScrollToSnippetInjected } from "../../lib/features/page-dom/injected-find-page-scroll-to-snippet"
import { bmxtScrollToSearchNeedleInjected } from "../../lib/features/page-dom/injected-scroll-to-search-needle"
import { bmxtClearSearchNeedleHighlightInjected } from "../../lib/features/page-dom/injected-clear-search-needle"
import {
  isPageClearNeedleRequest,
  isPageScrollNeedleRequest
} from "../../lib/features/page-dom/page-scroll-needle-message"
import { isPageScrollSnippetRequest } from "../../lib/features/page-dom/page-scroll-snippet-message"
import {
  bmxtNavControlInjected,
  NAV_OVERLAY_CHANNEL,
  type NavOverlayMessage
} from "../../lib/features/nav/nav-overlay-inject-fn"

export default defineContentScript({
  matches: ["https://*/*", "http://*/*"],
  allFrames: false,
  runAt: "document_idle",
  main() {
    chrome.runtime.onMessage.addListener((raw, _sender, sendResponse) => {
      if (isPageExtractRequest(raw)) {
        sendResponse(bmxtExtractPageInnerTextInPage(raw.maxChars))
        return true
      }
      if (isPageScrollNeedleRequest(raw)) {
        const colors = raw.highlightColors
        const hitBg = colors?.hitBg ?? "#ffc9dd"
        const jumpBg = colors?.jumpBg ?? "#ffdb4d"
        const fg = colors?.fg ?? "#0d1117"
        sendResponse(
          bmxtScrollToSearchNeedleInjected(
            raw.searchNeedle,
            raw.lineNo,
            raw.snippetHint,
            raw.persistMs ?? 0,
            raw.globalOccurrence ?? -1,
            hitBg,
            jumpBg,
            fg,
            raw.activeOnly ?? false,
            raw.lineHitIndex ?? -1
          )
        )
        return true
      }
      if (isPageClearNeedleRequest(raw)) {
        sendResponse(bmxtClearSearchNeedleHighlightInjected())
        return true
      }
      if (isPageScrollSnippetRequest(raw)) {
        sendResponse(
          bmxtFindPageScrollToSnippetInjected(
            raw.snippet,
            raw.occurrence,
            8000
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
        msg.text ?? "",
        msg.labelsJson ?? ""
      )
      sendResponse(result)
      return true
    })
  }
})
