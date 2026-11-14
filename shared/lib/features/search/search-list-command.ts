import type { DispatchHostContext } from "../dispatch/dispatch-context.ts"
import type { CommandDispatchDeps } from "../bmxt-window/shell/command-dispatch/types.ts"
import type { ListCommandEntry } from "../command-line/list-commands/types.ts"
import { mergeJobIntoDispatchContext } from "../job"
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

/** EN: Bind parent `search-list` job cancel onto the dispatch context when present. */
function resolveSearchDispatchCtx(
  deps: CommandDispatchDeps | undefined,
  locale: UiLocale,
  existing: DispatchHostContext | undefined
): DispatchHostContext {
  const base = existing ?? stubSearchDispatchCtx(deps, locale)
  if (base.shouldCancel !== undefined) {
    return base
  }
  const job = deps?.jobRunner.getActive("search-list") ?? null
  if (job === null) {
    return base
  }
  // EN: Merge even when already cancelled — wind-down still needs shouldCancel === true.
  // JA: キャンセル済みでも merge する（巻き戻し中も shouldCancel が true のまま必要）。
  return mergeJobIntoDispatchContext(base, job)
}

export const searchListCommand: ListCommandEntry<SearchListMatch> = {
  id: "search",
  command: "search",
  // EN: UI-owned when peers are involved — WebRTC SyncService lives in the BMXt page.
  runtime: "ui",
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
    const dispatchCtx = resolveSearchDispatchCtx(ctx.deps, ctx.locale, ctx.dispatchCtx)
    const onProgress =
      ctx.deps !== undefined
        ? async (message: string): Promise<void> => {
            if (dispatchCtx.shouldCancel?.()) {
              return
            }
            await ctx.deps!.appendLogLines([message], "stdout")
          }
        : undefined
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
  formatPlainLines(result, locale, _match) {
    return formatSearchListPlainLines(result, locale)
  }
}
