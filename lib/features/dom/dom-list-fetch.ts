import type { ListResult } from "../command-line/list-output/types.ts"
import { LIST_OUTPUT_SCHEMA } from "../command-line/list-output/types.ts"
import { canScriptHttpHostPages } from "../extension-permissions/optional-http-hosts.ts"
import type { DispatchChromeContext } from "../dispatch/dispatch-context.ts"
import { resolveTargetTabForActiveWindow } from "../page-dom/resolve-target-tab.ts"
import {
  describeNonScriptableReason,
  isScriptablePageUrl
} from "../url/is-scriptable-page-url.ts"
import type { UiLocale } from "../setting/locale.ts"
import {
  domListCaptureFailedLines,
  domListNoTargetLines,
  domListUnscriptableLines,
  optionalHostDeniedLines
} from "../setting/i18n/resolvers.ts"
import type { DomListCapture } from "./dom-list-capture.ts"
import { captureDomListForTab } from "./dom-list-capture.ts"
import { domCaptureToListResult } from "./dom-list-result.ts"
import type { DomListFlavor, DomPickerMode } from "./dom-picker-mode.ts"

export type DomListMatch = {
  flavor: DomListFlavor
  pickerMode: DomPickerMode
  showTag: boolean
  pattern: string
}

export type DomListFetchParams = DomListMatch & {
  locale: UiLocale
  resolveTab?: () => Promise<chrome.tabs.Tab | undefined>
  onCapture?: (capture: DomListCapture) => void
}

/** EN: Resolve target tab for plain `dom -list` (effect override, then active window). */
export async function resolveDomListTab(
  dispatchCtx?: DispatchChromeContext
): Promise<chrome.tabs.Tab | undefined> {
  if (dispatchCtx?.resolveDomListTargetTabId !== undefined) {
    const tabId = await dispatchCtx.resolveDomListTargetTabId()
    if (tabId !== undefined) {
      try {
        return await chrome.tabs.get(tabId)
      } catch {
        /* tab may have closed — fall through */
      }
    }
  }
  return resolveTargetTabForActiveWindow()
}

function displayTitle(title: string | undefined): string {
  const trimmed = (title ?? "").trim()
  return trimmed.length > 0 ? trimmed : "(untitled)"
}

function domNoticeListResult(lines: readonly string[]): ListResult {
  return {
    schema: LIST_OUTPUT_SCHEMA,
    command: "dom",
    subcommand: "-list",
    records: lines.map((line) => ({
      kind: "dom.notice",
      fields: { notice: "status" },
      display: { label: line }
    }))
  }
}

function notifyCapture(
  onCapture: DomListFetchParams["onCapture"],
  lines: readonly string[]
): void {
  onCapture?.({
    lines: [...lines],
    jumpPaths: lines.map(() => null),
    headerLineCount: lines.length
  })
}

export async function fetchDomListResultUnified(params: DomListFetchParams): Promise<ListResult> {
  const { locale, resolveTab, onCapture, ...match } = params
  const resolve = resolveTab ?? resolveTargetTabForActiveWindow
  const tab = await resolve()

  if (tab?.id === undefined) {
    const lines = domListNoTargetLines(locale, "(no tab)", "(no url)")
    notifyCapture(onCapture, lines)
    return domNoticeListResult(lines)
  }

  const title = displayTitle(tab.title)
  const url = tab.url ?? "(no url)"

  if (!isScriptablePageUrl(tab.url)) {
    const reason = describeNonScriptableReason(tab.url)
    const lines = domListUnscriptableLines(locale, title, url, reason ?? undefined)
    notifyCapture(onCapture, lines)
    return domNoticeListResult(lines)
  }

  if (!(await canScriptHttpHostPages())) {
    const lines = optionalHostDeniedLines(locale)
    notifyCapture(onCapture, lines)
    return domNoticeListResult(lines)
  }

  try {
    const capture = await captureDomListForTab(
      tab,
      match.flavor,
      match.pattern,
      locale,
      match.pickerMode,
      match.showTag
    )
    onCapture?.(capture)
    return domCaptureToListResult(capture, {
      flavor: match.flavor,
      pickerMode: match.pickerMode,
      pattern: match.pattern,
      locale
    })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    const lines = domListCaptureFailedLines(locale, title, url, detail)
    notifyCapture(onCapture, lines)
    return domNoticeListResult(lines)
  }
}
