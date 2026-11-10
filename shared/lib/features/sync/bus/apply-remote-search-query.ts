import type { DispatchHostContext } from "../../dispatch/dispatch-context.ts"
import { fetchSearchListResult } from "../../search/search-list-plain.ts"
import type { UiLocale } from "../../setting/locale.ts"
import type { SyncRemoteSearchHit } from "../types.ts"
import { SYNC_REMOTE_SEARCH_MAX_HITS } from "./remote-query-limits.ts"

function stubPeerSearchDispatchCtx(locale: UiLocale): DispatchHostContext {
  return {
    enqueueSessionPatch: () => {},
    clearLog: async () => {},
    exitPane: async () => [],
    listWindows: async () => [],
    focusInfo: async () => [],
    resolveTabArg: async () => undefined,
    commandSessionId: "sync-peer-search",
    uiLocale: locale
  }
}

/**
 * EN: Run a portable search_query RPC on this browser.
 * JA: 受信した search_query をこのブラウザで実行する。
 */
export async function applyRemoteSearchQuery(options: {
  dispatchLine: string
  locale: UiLocale
}): Promise<{ ok: boolean; detail: string; hits: SyncRemoteSearchHit[] }> {
  const line = options.dispatchLine.trim()
  if (line.length === 0 || line.length > 2000) {
    return { ok: false, detail: "bad_dispatch_line", hits: [] }
  }
  if (!/^search\s+-list\b/i.test(line)) {
    return { ok: false, detail: "not_search_list", hits: [] }
  }
  try {
    const result = await fetchSearchListResult({
      dispatchLine: line,
      ctx: stubPeerSearchDispatchCtx(options.locale),
      locale: options.locale
    })
    const hits: SyncRemoteSearchHit[] = []
    for (const record of result.records) {
      if (record.kind !== "search.hit") {
        continue
      }
      if (hits.length >= SYNC_REMOTE_SEARCH_MAX_HITS) {
        return {
          ok: true,
          detail: `truncated=${SYNC_REMOTE_SEARCH_MAX_HITS}`,
          hits
        }
      }
      const windowIdRaw = record.fields.windowId
      const windowId =
        typeof windowIdRaw === "number" && Number.isFinite(windowIdRaw) ? windowIdRaw : null
      const tabIdRaw = record.fields.tabId
      const tabId =
        typeof tabIdRaw === "number" && Number.isFinite(tabIdRaw) && tabIdRaw > 0
          ? tabIdRaw
          : null
      hits.push({
        index: hits.length + 1,
        source: String(record.fields.source ?? "search"),
        title: String(record.fields.title ?? ""),
        url: String(record.fields.url ?? ""),
        tabId,
        hitCount:
          typeof record.fields.hitCount === "number" ? record.fields.hitCount : 0,
        pattern: String(record.fields.pattern ?? ""),
        windowId
      })
    }
    return { ok: true, detail: `hits=${hits.length}`, hits }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, detail: message.slice(0, 200), hits: [] }
  }
}
