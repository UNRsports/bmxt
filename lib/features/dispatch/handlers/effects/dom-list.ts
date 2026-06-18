import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import { captureDomListForTab } from "../../../dom/dom-list-capture"
import { resolveTargetTabForActiveWindow } from "../../../page-dom/resolve-target-tab"
import { canScriptHttpHostPages } from "../../../extension-permissions/optional-http-hosts"
import {
  describeNonScriptableReason,
  isScriptablePageUrl
} from "../../../url/is-scriptable-page-url"
import { DEFAULT_UI_LOCALE } from "../../../setting/locale"
import {
  domListCaptureFailedLines,
  domListNoTargetLines,
  domListUnscriptableLines,
  optionalHostDeniedLines
} from "../../../setting/i18n"

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

export async function applyDomListEffect(
  ctx: DispatchChromeContext,
  e: E
): Promise<string[]> {
  const locale = ctx.uiLocale ?? DEFAULT_UI_LOCALE
  const tab = await resolveTabForDomList(ctx)
  const tabId = tab?.id
  if (tabId === undefined) {
    const lines = domListNoTargetLines(locale, "(no tab)", "(no url)")
    ctx.onDomListCapture?.({
      lines,
      jumpPaths: lines.map(() => null),
      headerLineCount: lines.length
    })
    return lines
  }
  const title = displayTitle(tab.title)
  const url = tab.url ?? "(no url)"
  if (!isScriptablePageUrl(tab.url)) {
    const reason = describeNonScriptableReason(tab.url)
    const lines = domListUnscriptableLines(locale, title, url, reason ?? undefined)
    ctx.onDomListCapture?.({
      lines,
      jumpPaths: lines.map(() => null),
      headerLineCount: lines.length
    })
    return lines
  }
  if (!(await canScriptHttpHostPages())) {
    return optionalHostDeniedLines(locale)
  }
  try {
    const capture = await captureDomListForTab(tab, e.flavor, e.pattern, locale)
    ctx.onDomListCapture?.(capture)
    return capture.lines
  } catch (err) {
    const lines = domListCaptureFailedLines(
      locale,
      title,
      url,
      err instanceof Error ? err.message : String(err)
    )
    ctx.onDomListCapture?.({
      lines,
      jumpPaths: lines.map(() => null),
      headerLineCount: lines.length
    })
    return lines
  }
}
