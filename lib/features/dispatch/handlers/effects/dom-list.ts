import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import {
  ensureOptionalHttpHostAccess,
  OPTIONAL_HOST_DENIED_LINES
} from "../../../extension-permissions/optional-http-hosts"
import { bodyToTerminalLines } from "../../../page-dom/dom-terminal-lines"
import { bmxtDomShowInjected } from "../../../page-dom/injected-dom-show"
import { resolveTargetTabForActiveWindow } from "../../../page-dom/resolve-target-tab"
import {
  describeNonScriptableReason,
  isScriptablePageUrl
} from "../../../url/is-scriptable-page-url"

type E = Extract<ChromeEffect, { kind: "dom_list" }>

function displayTitle(t: string | undefined): string {
  const s = (t ?? "").trim()
  return s.length > 0 ? s : "(untitled)"
}

/**
 * EN: Returns DOM lines for the `dom -list` picker — DOM snapshot of the active tab,
 *     optionally filtered by pattern.
 *
 *     `ctx.resolveTabArg` is stubbed to `undefined` on the picker-direct dispatch path
 *     (see `BmxtShell.submitLine`), so we resolve the target tab via the shared utility that
 *     mirrors background `resolveTabArg(undefined)`.
 *
 *     We never surface the chrome tab id in the UI — only title + URL are shown.
 *
 * JA: `dom -list` ピッカー用にアクティブタブの DOM 行を返す。任意で pattern により部分一致絞り込み。
 *     picker 直結経路（`BmxtShell.submitLine`）では `ctx.resolveTabArg` が `undefined` 固定の
 *     stub なので、background と同等の共有ユーティリティで対象タブを引く。
 *     Chrome 内部 ID は UI には出さず、タイトルと URL のみを表示する。
 */
async function resolveTabForDomList(ctx: DispatchChromeContext): Promise<chrome.tabs.Tab | undefined> {
  const overrideId = await ctx.resolveDomListTargetTabId?.()
  if (overrideId !== undefined) {
    try {
      return await chrome.tabs.get(overrideId)
    } catch {
      /* tab may have closed — fall through */
    }
  }
  return resolveTargetTabForActiveWindow()
}

export async function applyDomListEffect(
  ctx: DispatchChromeContext,
  e: E
): Promise<string[]> {
  const tab = await resolveTabForDomList(ctx)
  const tabId = tab?.id
  if (tabId === undefined) {
    return [
      "dom -list — 表示不可",
      "JA: 対象タブがありません。通常のブラウザウィンドウでページを開いてください。",
      "EN: No target tab — focus a normal browser window with a page."
    ]
  }
  if (!isScriptablePageUrl(tab.url)) {
    const reason = describeNonScriptableReason(tab.url)
    return [
      "dom -list — 表示不可",
      "JA: 権限のないページのため、本拡張機能では DOM を表示できません。",
      "EN: This extension cannot show DOM on pages Chrome blocks from scripting (chrome://, Web Store, extension pages, etc.).",
      `target: ${displayTitle(tab.title)}`,
      `url: ${tab.url ?? "(no url)"}`,
      ...(reason ? [`detail: ${reason}`] : [])
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
    const head = `dom -list (${e.flavor}) — ${displayTitle(tab.title)}`
    const urlLine = `url: ${tab.url ?? "(no url)"}`
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
      return [head, urlLine, pat.length === 0 ? "(empty capture)" : `(no lines matched "${pat}")`]
    }
    return [head, urlLine, "---", ...filtered]
  } catch (err) {
    return [
      "dom -list — 表示不可",
      "JA: このページでは DOM を取得できませんでした。",
      "EN: Could not capture DOM on this page.",
      `detail: ${err instanceof Error ? err.message : String(err)}`,
      `target: ${displayTitle(tab.title)}`,
      `url: ${tab.url ?? "(no url)"}`
    ]
  }
}
