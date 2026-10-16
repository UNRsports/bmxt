/**
 * EN: Content script — nav overlay + in-page float prompt host on http(s) pages.
 *     Idempotent on programmatic re-inject after install/update (no page reload).
 *     Always-on for http(s) by design (required host_permissions); actions stay
 *     message-driven and same-extension-only (`sender.id` check).
 * JA: 常駐 CS。nav オーバーレイとサイト上フロート・プロンプトを扱う。
 *     インストール／更新後のプログラム再注入でも二重登録しない。
 *     http(s) 常駐は仕様（必須 host_permissions）。操作はメッセージ駆動かつ同一拡張のみ。
 */

import {
  bmxtExtractPageInnerTextInPage,
  bmxtProbePageInnerTextLengthInPage,
  isPageExtractRequest
} from "../../lib/features/page-extract/page-extract-message"
import { clampPageExtractMaxChars } from "../../lib/features/page-extract/page-extract-limits"
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
import {
  buildBmxtCsPingResponse,
  isBmxtCsPingRequest
} from "../../lib/features/page-scripting/cs-ping-message"

const CS_GUARD_KEY = "__BMXT_NAV_OVERLAY_CS__"

type CsGuard = {
  generation: number
  extensionId: string
  onMessage: (
    raw: unknown,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ) => boolean
}

type GlobalWithCsGuard = typeof globalThis & {
  [CS_GUARD_KEY]?: CsGuard
}

export default defineContentScript({
  matches: ["https://*/*", "http://*/*"],
  allFrames: false,
  runAt: "document_idle",
  main() {
    const root = globalThis as GlobalWithCsGuard
    const previous = root[CS_GUARD_KEY]
    if (previous?.onMessage) {
      try {
        chrome.runtime.onMessage.removeListener(previous.onMessage)
      } catch {
        /* orphaned extension context — ignore */
      }
    }

    const generation = (previous?.generation ?? 0) + 1
    const extensionId = chrome.runtime.id

    const onMessage = (
      raw: unknown,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response?: unknown) => void
    ): boolean => {
      const guard = root[CS_GUARD_KEY]
      if (!guard || guard.generation !== generation || guard.extensionId !== extensionId) {
        return false
      }
      // EN: Reject other extensions only. `sender.id` may be omitted for same-extension
      //     `tabs.sendMessage` from the service worker in some Chrome builds — do not treat
      //     missing id as foreign (that broke ping / search page reads).
      if (typeof sender.id === "string" && sender.id.length > 0 && sender.id !== extensionId) {
        return false
      }

      if (isBmxtCsPingRequest(raw)) {
        sendResponse(buildBmxtCsPingResponse())
        return true
      }
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
          sendResponse(bmxtExtractPageInnerTextInPage(clampPageExtractMaxChars(raw.maxChars)))
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
    }

    root[CS_GUARD_KEY] = {
      generation,
      extensionId,
      onMessage
    }
    chrome.runtime.onMessage.addListener(onMessage)
  }
})
