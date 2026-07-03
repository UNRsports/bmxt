import type { ListCommandEntry } from "../command-line/list-commands/types.ts"
import { parseDomListLine } from "./dom-list-parse.ts"
import { fetchDomListResultUnified, resolveDomListTab, type DomListMatch } from "./dom-list-fetch.ts"
import { formatDomListPlainLines } from "./dom-list-plain.ts"

export type { DomListMatch } from "./dom-list-fetch.ts"

export const domListCommand: ListCommandEntry<DomListMatch> = {
  id: "dom",
  command: "dom",
  runtime: "service_worker",
  matchPlain(segment) {
    const parsed = parseDomListLine(segment)
    if (parsed === null || parsed.picker) {
      return null
    }
    return {
      flavor: parsed.flavor,
      pickerMode: parsed.pickerMode,
      showTag: parsed.showTag,
      pattern: parsed.pattern
    }
  },
  usesPicker(segment) {
    return parseDomListLine(segment)?.picker === true
  },
  async fetchListResult(match, ctx) {
    return fetchDomListResultUnified({
      ...match,
      locale: ctx.locale,
      resolveTab: () => resolveDomListTab(ctx.dispatchCtx),
      onCapture: ctx.dispatchCtx?.onDomListCapture
    })
  },
  formatPlainLines(result, locale) {
    return formatDomListPlainLines(result, locale)
  }
}
