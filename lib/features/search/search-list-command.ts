import type { DispatchChromeContext } from "../dispatch/dispatch-context.ts"
import type { CommandDispatchDeps } from "../bmxt-window/shell/command-dispatch/types.ts"
import type { ListCommandEntry } from "../command-line/list-commands/types.ts"
import type { UiLocale } from "../setting/locale.ts"
import { parseSearchListLine } from "./search-list-parse.ts"
import { fetchSearchListResult, formatSearchListPlainLines } from "./search-list-plain.ts"

export type SearchListMatch = {
  dispatchLine: string
}

function stubSearchDispatchCtx(
  deps: CommandDispatchDeps | undefined,
  locale: UiLocale
): DispatchChromeContext {
  return {
    enqueueSessionPatch: () => {},
    clearLog: async () => {},
    exitPane: async () => [],
    listWindows: async () => [],
    focusInfo: async () => [],
    resolveTabArg: async () => undefined,
    commandSessionId: deps?.sessionId ?? "",
    uiLocale: locale
  }
}

export const searchListCommand: ListCommandEntry<SearchListMatch> = {
  id: "search",
  command: "search",
  runtime: "service_worker",
  matchPlain(segment) {
    const parsed = parseSearchListLine(segment)
    if (parsed === null || parsed.picker) {
      return null
    }
    return { dispatchLine: parsed.dispatchLine }
  },
  usesPicker(segment) {
    return parseSearchListLine(segment)?.picker === true
  },
  async fetchListResult(match, ctx) {
    const dispatchCtx = ctx.dispatchCtx ?? stubSearchDispatchCtx(ctx.deps, ctx.locale)
    return fetchSearchListResult({
      dispatchLine: match.dispatchLine,
      locale: ctx.locale,
      ctx: dispatchCtx
    })
  },
  formatPlainLines(result, locale) {
    return formatSearchListPlainLines(result, locale)
  }
}
