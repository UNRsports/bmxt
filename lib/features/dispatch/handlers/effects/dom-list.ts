import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import {
  ensureOptionalHttpHostAccess,
  OPTIONAL_HOST_DENIED_LINES
} from "../../../extension-permissions/optional-http-hosts"
import { bodyToTerminalLines } from "../../../page-dom/dom-terminal-lines"
import { bmxtDomShowInjected } from "../../../page-dom/injected-dom-show"
import { resolveTargetTabForActiveWindow } from "../../../page-dom/resolve-target-tab"
import { isHttpUrl } from "../../../url/is-http-url"

type E = Extract<ChromeEffect, { kind: "dom_list" }>

/**
 * EN: Returns DOM lines for the `dom -list` picker — DOM snapshot of the active tab,
 *     optionally filtered by pattern.
 * JA: `dom -list` ピッカー用にアクティブタブの DOM 行を返す。任意で pattern により部分一致絞り込み。
 *
 *     `ctx.resolveTabArg` is stubbed to `undefined` on the picker-direct dispatch path
 *     (see `BmxtShell.submitLine`), so we resolve the target tab via the shared utility that
 *     mirrors background `resolveTabArg(undefined)`.
 *     picker 直結経路（`BmxtShell.submitLine`）では `ctx.resolveTabArg` が `undefined` 固定の
 *     stub なので、background と同等の共有ユーティリティで対象タブを引く。
 */
export async function applyDomListEffect(
  _ctx: DispatchChromeContext,
  e: E
): Promise<string[]> {
  const tab = await resolveTargetTabForActiveWindow()
  const tabId = tab?.id
  if (tabId === undefined) {
    return [
      "(no target tab — focus a normal browser window with a page, then run dom -list again)",
      "EN/JA: BMXt は「最後にフォーカスした通常ウィンドウ」のアクティブタブを対象にします。"
    ]
  }
  if (!isHttpUrl(tab.url)) {
    return [
      "error: dom -list needs an http(s) page in the target tab.",
      `target tab: id=${tabId} url=${tab.url ?? "(none)"}`,
      "EN/JA: 対象タブが http(s) の通常ページである必要があります。"
    ]
  }
  const access = await ensureOptionalHttpHostAccess()
  if (access === "denied") {
    return [...OPTIONAL_HOST_DENIED_LINES]
  }
  const mode = e.flavor === "--react" ? "react" : "html"
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: bmxtDomShowInjected,
      args: [mode]
    })
    const r = result as { kind?: string; body?: string }
    const body = typeof r?.body === "string" ? r.body : ""
    const head = `dom -list (${e.flavor}) tab ${tabId} — kind=${r?.kind ?? "?"} url=${tab.url ?? "(none)"}`
    const lines = bodyToTerminalLines(body)
    const pat = e.pattern.trim()
    const filtered = (() => {
      if (pat.length === 0) {
        return lines
      }
      const needle = pat.toLowerCase()
      return lines.filter((ln) => ln.toLowerCase().includes(needle))
    })()
    if (filtered.length === 0) {
      return [head, pat.length === 0 ? "(empty capture)" : `(no lines matched "${pat}")`]
    }
    return [head, "---", ...filtered]
  } catch (err) {
    return [
      `error: executeScript failed — ${err instanceof Error ? err.message : String(err)}`,
      "EN: Ensure the tab is http(s), scripting is allowed, and optional site access is granted.",
      "JA: 対象が http(s) か、scripting とオプションのサイトアクセス許可を確認してください。"
    ]
  }
}
