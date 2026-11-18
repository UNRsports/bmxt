import type { HostEffect } from "../../effect-types"
import type { DispatchHostContext } from "../../dispatch-context"
import { effectT } from "../effect-i18n"
import { parseHttpUrlForEffect } from "../shared"

type E = Extract<HostEffect, { kind: "history_delete_url" }>

const MAX_URLS = 200

export async function applyHistoryDeleteUrlEffect(
  ctx: DispatchHostContext,
  e: E
): Promise<string[]> {
  const rawParts = e.urls
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
  if (rawParts.length === 0 || rawParts.length > MAX_URLS) {
    return [effectT(ctx, "effect.historyDeleteUrl.rejected")]
  }
  const urls: string[] = []
  for (const raw of rawParts) {
    const url = parseHttpUrlForEffect(raw)
    if (!url) {
      return [effectT(ctx, "effect.historyDeleteUrl.rejectedUrl", { url: raw })]
    }
    urls.push(url)
  }
  const lines: string[] = []
  let deleted = 0
  for (const url of urls) {
    try {
      await chrome.history.deleteUrl({ url })
      deleted += 1
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      lines.push(effectT(ctx, "effect.historyDeleteUrl.failedOne", { url, message }))
    }
  }
  lines.unshift(effectT(ctx, "effect.historyDeleteUrl.ok", { count: String(deleted) }))
  return lines
}
