import type { DispatchHostContext } from "../../dispatch/dispatch-context.ts"
import { SEARCH_REMOTE_MAX_HITS_PER_PEER } from "../../search/peer/remote-search-wire-limits.ts"
import { clipRemoteSearchHitFields } from "../../search/peer/remote-search-hit-pack.ts"
import { fetchSearchListResult } from "../../search/search-list-plain.ts"
import type { UiLocale } from "../../setting/locale.ts"
import type { SyncRemoteSearchHit } from "../types.ts"

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
 * EN: Run a portable search_query RPC on this browser (wire-oriented; no enrich).
 * JA: 受信した search_query をこのブラウザで実行する（ワイヤ向け・enrich なし）。
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
      locale: options.locale,
      forRemoteWire: true
    })
    const hits: SyncRemoteSearchHit[] = []
    let truncated = false
    for (const record of result.records) {
      if (record.kind !== "search.hit") {
        continue
      }
      if (hits.length >= SEARCH_REMOTE_MAX_HITS_PER_PEER) {
        truncated = true
        break
      }
      const windowIdRaw = record.fields.windowId
      const windowId =
        typeof windowIdRaw === "number" && Number.isFinite(windowIdRaw) ? windowIdRaw : null
      const tabIdRaw = record.fields.tabId
      const tabId =
        typeof tabIdRaw === "number" && Number.isFinite(tabIdRaw) && tabIdRaw > 0
          ? tabIdRaw
          : null
      hits.push(
        clipRemoteSearchHitFields({
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
      )
    }
    const detail = truncated
      ? `truncated=${SEARCH_REMOTE_MAX_HITS_PER_PEER}`
      : `hits=${hits.length}`
    return { ok: true, detail, hits }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, detail: message.slice(0, 200), hits: [] }
  }
}
