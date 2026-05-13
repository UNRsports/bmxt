import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import { bmxtDomFilterInjected } from "../../../page-dom/injected-dom-filter"

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
      "EN: Ensure the tab is http(s) and the extension has scripting + host access.",
      "JA: 対象が http(s) か、scripting / host 権限を確認してください。"
    ]
  }
}
