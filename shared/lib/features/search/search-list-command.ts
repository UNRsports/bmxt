import type { DispatchHostContext } from "../dispatch/dispatch-context.ts"
import type { CommandDispatchDeps } from "../bmxt-window/shell/command-dispatch/types.ts"
import type { ListCommandEntry } from "../command-line/list-commands/types.ts"
import type { UiLocale } from "../setting/locale.ts"
import type { DeviceListScope } from "../sync/bus/device-list-scope.ts"
import { fetchCrossDeviceSearchList } from "../sync/bus/fetch-cross-device-search.ts"
import { parseSearchListLine } from "./search-list-parse.ts"
import { fetchSearchListResult, formatSearchListPlainLines } from "./search-list-plain.ts"

export type SearchListMatch = {
  dispatchLine: string
  peerDispatchLine: string
  scope: DeviceListScope
}

function stubSearchDispatchCtx(
  deps: CommandDispatchDeps | undefined,
  locale: UiLocale
): DispatchHostContext {
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
    if (parsed === null) {
      return null
    }
    return {
      dispatchLine: parsed.dispatchLine,
      peerDispatchLine: parsed.peerDispatchLine,
      scope: parsed.scope
    }
  },
  async fetchListResult(match, ctx) {
    const onProgress =
      ctx.deps !== undefined
        ? async (message: string): Promise<void> => {
            await ctx.deps!.appendLogLines([message], "stdout")
          }
        : undefined
    const dispatchCtx = ctx.dispatchCtx ?? stubSearchDispatchCtx(ctx.deps, ctx.locale)
    if (match.scope.kind === "local") {
      return fetchSearchListResult({
        dispatchLine: match.peerDispatchLine,
        ctx: dispatchCtx,
        locale: ctx.locale,
        onProgress
      })
    }
    const fetched = await fetchCrossDeviceSearchList({
      dispatchLine: match.dispatchLine,
      scope: match.scope,
      ctx: dispatchCtx,
      locale: ctx.locale,
      onProgress
    })
    return fetched.result
  },
  formatPlainLines(result, locale, match) {
    const body = formatSearchListPlainLines(result, locale)
    if (match.scope.kind === "local") {
      return body
    }
    // EN: Notices are expanded at effect/plain run time when available; keep format pure here.
    return body
  }
}
