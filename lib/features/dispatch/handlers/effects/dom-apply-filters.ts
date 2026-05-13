import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import {
  ensureOptionalHttpHostAccess,
  OPTIONAL_HOST_DENIED_LINES
} from "../../../extension-permissions/optional-http-hosts"
import { bmxtDomFilterInjected } from "../../../page-dom/injected-dom-filter"
import { isHttpUrl } from "../../../url/is-http-url"

type E = Extract<ChromeEffect, { kind: "dom_apply_filters" }>

/**
 * EN: Applies DOM visibility on the resolved tab; does not store history or DOM snapshots.
 * JA: 解決したタブの DOM 表示のみ変更。履歴や DOM の保存は行いません。
 */
export async function applyDomApplyFiltersEffect(
  ctx: DispatchChromeContext,
  e: E
): Promise<string[]> {
  const tab = await ctx.resolveTabArg(undefined)
  const tabId = tab?.id
  if (tabId === undefined) {
    return [
      "(no target tab — focus a normal browser window with a page, then run dom again)",
      "EN/JA: BMXt は「最後にフォーカスした通常ウィンドウ」のアクティブタブを対象にします。"
    ]
  }
  let selectors: string[]
  try {
    selectors = JSON.parse(e.selectors) as string[]
  } catch {
    return ["error: internal selectors payload"]
  }
  if (!Array.isArray(selectors) || selectors.length === 0) {
    return ["error: no selectors"]
  }
  if (!isHttpUrl(tab.url)) {
    return [
      "error: dom needs an http(s) page in the target tab.",
      "EN/JA: 対象タブが http(s) の通常ページである必要があります。"
    ]
  }
  const access = await ensureOptionalHttpHostAccess()
  if (access === "denied") {
    return [...OPTIONAL_HOST_DENIED_LINES]
  }
  const op = e.op === "hide" ? "hide" : "select"
  const payload = { op, selectors }
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: bmxtDomFilterInjected,
      args: [payload]
    })
    const msg = typeof result === "string" ? result : String(result)
    return [
      `dom ${e.op} (${e.flavor}) on tab ${tabId}: ${msg}`,
      "EN: Reload the page to clear injected styles/markers.",
      "JA: 注入スタイルを消すにはページを再読み込みしてください。"
    ]
  } catch (err) {
    return [
      `error: executeScript failed — ${err instanceof Error ? err.message : String(err)}`,
      "EN: Ensure the tab is http(s), scripting is allowed, and optional site access is granted.",
      "JA: 対象が http(s) か、scripting とオプションのサイトアクセス許可を確認してください。"
    ]
  }
}
