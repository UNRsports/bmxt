import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import { captureDomListForTab } from "../../../dom/dom-list-capture"
import { resolveTargetTabForActiveWindow } from "../../../page-dom/resolve-target-tab"
import {
  canScriptHttpHostPages,
  OPTIONAL_HOST_DENIED_LINES
} from "../../../extension-permissions/optional-http-hosts"
import {
  describeNonScriptableReason,
  isScriptablePageUrl
} from "../../../url/is-scriptable-page-url"

type E = Extract<ChromeEffect, { kind: "dom_list" }>

function displayTitle(t: string | undefined): string {
  const s = (t ?? "").trim()
  return s.length > 0 ? s : "(untitled)"
}

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

function unscriptableLines(tab: chrome.tabs.Tab): string[] {
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

export async function applyDomListEffect(
  ctx: DispatchChromeContext,
  e: E
): Promise<string[]> {
  const tab = await resolveTabForDomList(ctx)
  const tabId = tab?.id
  if (tabId === undefined) {
    const lines = [
      "dom -list — 表示不可",
      "JA: 対象タブがありません。通常のブラウザウィンドウでページを開いてください。",
      "EN: No target tab — focus a normal browser window with a page."
    ]
    ctx.onDomListCapture?.({
      lines,
      jumpPaths: lines.map(() => null),
      headerLineCount: lines.length
    })
    return lines
  }
  if (!isScriptablePageUrl(tab.url)) {
    const lines = unscriptableLines(tab)
    ctx.onDomListCapture?.({
      lines,
      jumpPaths: lines.map(() => null),
      headerLineCount: lines.length
    })
    return lines
  }
  if (!(await canScriptHttpHostPages())) {
    return [...OPTIONAL_HOST_DENIED_LINES]
  }
  try {
    const capture = await captureDomListForTab(tab, e.flavor, e.pattern)
    ctx.onDomListCapture?.(capture)
    return capture.lines
  } catch (err) {
    const lines = [
      "dom -list — 表示不可",
      "JA: このページでは DOM を取得できませんでした。",
      "EN: Could not capture DOM on this page.",
      `detail: ${err instanceof Error ? err.message : String(err)}`,
      `target: ${displayTitle(tab.title)}`,
      `url: ${tab.url ?? "(no url)"}`
    ]
    ctx.onDomListCapture?.({
      lines,
      jumpPaths: lines.map(() => null),
      headerLineCount: lines.length
    })
    return lines
  }
}
