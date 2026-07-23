import { appendListPlainSummary } from "../command-line/list-output/format-plain-summary.ts"
import { formatListPlainLines } from "../command-line/list-output/format-plain-lines.ts"
import type { ListResult } from "../command-line/list-output/types.ts"
import { applyChromeEffects, type DispatchChromeContext } from "../dispatch"
import type { ChromeEffect } from "../dispatch/effect-types.ts"
import type { CommandBusyProgress } from "../bmxt-window/shell/command-busy"
import type { UiLocale } from "../setting/locale.ts"
import { tSearch } from "../setting/i18n/ns/search.ts"
import { enrichSearchPickerEntriesFromOpenTabs } from "./enrich-search-entries-from-tabs.ts"
import { searchEffectsForDispatchLine } from "./search-list-effects.ts"
import { buildSearchListResult } from "./search-list-result.ts"
import { normalizeSearchListDispatchLine, parseSearchListPageOptions, searchListPatternFromLine } from "./search-list-picker-parse.ts"
import { normalizeSearchPattern } from "./search-format.ts"
import { searchPageProgressLabel } from "./sources/page-progress.ts"
import type { SearchPageProgress } from "./sources/page-progress.ts"
import { pickerEntriesFromSearchLines } from "../side-picker/model/from-search-lines.ts"

export type SearchListFetchOptions = {
  dispatchLine: string
  locale: UiLocale
  ctx: DispatchChromeContext
  /** EN: Live progress lines (scope start/done, page scan ticks). */
  onProgress?: (message: string) => Promise<void>
  /** EN: Structured overall progress for the prompt busy standard UI. */
  onBusyProgress?: (progress: CommandBusyProgress) => void | Promise<void>
}

function scopeLabelForEffect(effect: ChromeEffect, locale: UiLocale): string {
  switch (effect.kind) {
    case "search_history":
      return tSearch("search.list.scope.history", locale)
    case "search_bookmark":
      return tSearch("search.list.scope.bookmark", locale)
    case "search_page":
      return tSearch("search.list.scope.page", locale)
    case "search_snapshot":
      return tSearch("search.list.scope.snapshot", locale)
    default:
      return effect.kind
  }
}

export async function fetchSearchListResult(options: SearchListFetchOptions): Promise<ListResult> {
  const dispatchLine = normalizeSearchListDispatchLine(options.dispatchLine)
  const pattern = normalizeSearchPattern(searchListPatternFromLine(dispatchLine))
  const pageOptions = parseSearchListPageOptions(dispatchLine)
  const effects = searchEffectsForDispatchLine(dispatchLine)
  const onProgress = options.onProgress
  const onBusyProgress = options.onBusyProgress
  const scopeTotal = Math.max(1, effects.length)

  const emitBusy = async (progress: CommandBusyProgress): Promise<void> => {
    if (onBusyProgress) {
      await onBusyProgress(progress)
    }
  }

  const onSearchPageProgressInfo = async (
    page: SearchPageProgress,
    scopeIndex: number,
    scope: string
  ): Promise<void> => {
    const tabTotal = Math.max(0, page.tabTotal)
    const tabIndex = Math.max(0, page.tabIndex)
    const scopeFraction =
      tabTotal > 0 ? Math.min(1, tabIndex / tabTotal) : page.phase === "done" ? 1 : 0
    await emitBusy({
      kind: "fraction",
      current: scopeIndex + scopeFraction,
      total: scopeTotal,
      subCurrent: tabTotal > 0 ? tabIndex : undefined,
      subTotal: tabTotal > 0 ? tabTotal : undefined,
      detail: scope
    })
  }

  if (onProgress) {
    await onProgress(tSearch("search.list.progress.start", options.locale))
  }
  await emitBusy({ kind: "fraction", current: 0, total: scopeTotal })

  const linesOut: string[] = []
  for (let scopeIndex = 0; scopeIndex < effects.length; scopeIndex += 1) {
    const effect = effects[scopeIndex]!
    const scope = scopeLabelForEffect(effect, options.locale)
    if (onProgress) {
      await onProgress(tSearch("search.list.progress.scope", options.locale, { scope }))
    }
    await emitBusy({
      kind: "fraction",
      current: scopeIndex,
      total: scopeTotal,
      detail: scope
    })

    const ctx: DispatchChromeContext = {
      ...options.ctx,
      searchPageUnlimit: pageOptions.unlimit,
      onSearchPageProgress: onProgress ?? options.ctx.onSearchPageProgress,
      onSearchPageProgressInfo:
        effect.kind === "search_page"
          ? (page) => onSearchPageProgressInfo(page, scopeIndex, scope)
          : options.ctx.onSearchPageProgressInfo,
      searchPageProgressLabel:
        options.ctx.searchPageProgressLabel ?? searchPageProgressLabel(dispatchLine)
    }

    const lines = await applyChromeEffects(ctx, [effect])
    linesOut.push(...lines)
    if (onProgress) {
      await onProgress(tSearch("search.list.progress.scopeDone", options.locale, { scope }))
    }
    await emitBusy({
      kind: "fraction",
      current: scopeIndex + 1,
      total: scopeTotal,
      detail: scope
    })
  }

  const parsed = pickerEntriesFromSearchLines(linesOut)
  const maxPageTextChars = pageOptions.unlimit ? 0 : undefined
  const entries = await enrichSearchPickerEntriesFromOpenTabs(parsed, pattern, maxPageTextChars)
  return buildSearchListResult(entries, pattern, linesOut)
}

export function formatSearchListPlainLines(result: ListResult, locale: UiLocale): string[] {
  if (result.records.length === 0) {
    return [tSearch("search.list.empty", locale)]
  }
  const body = formatListPlainLines(result)
  const hitCount = result.records.filter((record) => record.fields.source !== "notice").length
  return appendListPlainSummary(body, hitCount > 0 ? hitCount : result.records.length, locale)
}

export async function runSearchListPlain(options: SearchListFetchOptions): Promise<string[]> {
  const result = await fetchSearchListResult(options)
  return formatSearchListPlainLines(result, options.locale)
}
