import { appendListPlainSummary } from "../command-line/list-output/format-plain-summary.ts"
import { formatListPlainLines } from "../command-line/list-output/format-plain-lines.ts"
import type { ListResult } from "../command-line/list-output/types.ts"
import { applyChromeEffects, type DispatchChromeContext } from "../dispatch"
import type { ChromeEffect } from "../dispatch/effect-types.ts"
import type { UiLocale } from "../setting/locale.ts"
import { tSearch } from "../setting/i18n/ns/search.ts"
import { enrichSearchPickerEntriesFromOpenTabs } from "./enrich-search-entries-from-tabs.ts"
import { searchEffectsForDispatchLine } from "./search-list-effects.ts"
import { buildSearchListResult } from "./search-list-result.ts"
import { normalizeSearchListDispatchLine, searchListPatternFromLine } from "./search-list-picker-parse.ts"
import { normalizeSearchPattern } from "./search-format.ts"
import { searchPageProgressLabel } from "./sources/page-progress.ts"
import { pickerEntriesFromSearchLines } from "../side-picker/model/from-search-lines.ts"

export type SearchListFetchOptions = {
  dispatchLine: string
  locale: UiLocale
  ctx: DispatchChromeContext
  /** EN: Live progress lines (scope start/done, page scan ticks). */
  onProgress?: (message: string) => Promise<void>
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
  const effects = searchEffectsForDispatchLine(dispatchLine)
  const onProgress = options.onProgress
  const ctx: DispatchChromeContext = {
    ...options.ctx,
    onSearchPageProgress: onProgress ?? options.ctx.onSearchPageProgress,
    searchPageProgressLabel:
      options.ctx.searchPageProgressLabel ?? searchPageProgressLabel(dispatchLine)
  }

  if (onProgress) {
    await onProgress(tSearch("search.list.progress.start", options.locale))
  }

  const linesOut: string[] = []
  for (const effect of effects) {
    const scope = scopeLabelForEffect(effect, options.locale)
    if (onProgress) {
      await onProgress(tSearch("search.list.progress.scope", options.locale, { scope }))
    }
    const lines = await applyChromeEffects(ctx, [effect])
    linesOut.push(...lines)
    if (onProgress) {
      await onProgress(tSearch("search.list.progress.scopeDone", options.locale, { scope }))
    }
  }

  const parsed = pickerEntriesFromSearchLines(linesOut)
  const entries = await enrichSearchPickerEntriesFromOpenTabs(parsed, pattern)
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
