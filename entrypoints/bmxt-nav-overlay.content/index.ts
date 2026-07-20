/**
 * EN: Content script — nav overlay + in-page float prompt host on http(s) pages.
 * JA: 常駐 CS。nav オーバーレイとサイト上フロート・プロンプトを扱う。
 */

import {
  bmxtExtractPageInnerTextInPage,
  bmxtProbePageInnerTextLengthInPage,
  isPageExtractRequest
} from "../../lib/features/page-extract/page-extract-message"
import { bmxtFindPageScrollToSnippetInjected } from "../../lib/features/page-dom/injected-find-page-scroll-to-snippet"
import { bmxtScrollToSearchNeedleInjected } from "../../lib/features/page-dom/injected-scroll-to-search-needle"
import { bmxtClearSearchNeedleHighlightInjected } from "../../lib/features/page-dom/injected-clear-search-needle"
import {
  isPageClearNeedleRequest,
  isPageScrollNeedleRequest,
  resolveNeedleHighlightColors
} from "../../lib/features/page-dom/page-scroll-needle-message"
import { isPageScrollSnippetRequest } from "../../lib/features/page-dom/page-scroll-snippet-message"
import { handleDomListInPageMessage } from "../../lib/features/page-dom/dom-list-in-page-handler"
import {
  bmxtNavControlInjected,
  NAV_OVERLAY_CHANNEL,
  type NavOverlayMessage
} from "../../lib/features/nav/nav-overlay-inject-fn"
import { isBmxtFloatHostRequest } from "../../lib/features/bmxt-float/float-host-message"
import { applyFloatHostAction } from "../../lib/features/bmxt-float/install-float-host"

export default defineContentScript({
  matches: ["https://*/*", "http://*/*"],
  allFrames: false,
  runAt: "document_idle",
  main() {
    chrome.runtime.onMessage.addListener((raw, sender, sendResponse) => {
      if (isBmxtFloatHostRequest(raw)) {
        const tabId =
          typeof raw.tabId === "number"
            ? raw.tabId
            : typeof sender.tab?.id === "number"
              ? sender.tab.id
              : null
        sendResponse(applyFloatHostAction(raw.action ?? "toggle", tabId))
        return true
      }
      if (isPageExtractRequest(raw)) {
        if (raw.lengthOnly === true) {
          sendResponse(bmxtProbePageInnerTextLengthInPage())
        } else {
          sendResponse(bmxtExtractPageInnerTextInPage(raw.maxChars))
        }
        return true
      }
      if (isPageScrollNeedleRequest(raw)) {
        const colors = resolveNeedleHighlightColors(raw.highlightColors)
        sendResponse(
          bmxtScrollToSearchNeedleInjected(
            raw.searchNeedle,
            raw.lineNo,
            raw.snippetHint,
            raw.persistMs ?? 0,
            raw.globalOccurrence ?? -1,
            colors.hitBg,
            colors.jumpBg,
            colors.fg,
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
      const domListResult = handleDomListInPageMessage(raw)
      if (domListResult !== null) {
        sendResponse(domListResult)
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
        msg.freeMove ? 1 : 0,
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
