import type { HostEffect } from "../../effect-types"
import type { DispatchHostContext } from "../../dispatch-context"
import { effectT } from "../effect-i18n"

type E = Extract<HostEffect, { kind: "history_delete_range" }>

function parseBound(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed.length === 0 || trimmed.length > 64) {
    return null
  }
  if (/^\d+$/.test(trimmed)) {
    const n = Number.parseInt(trimmed, 10)
    return Number.isFinite(n) && n >= 0 ? n : null
  }
  const ms = Date.parse(trimmed)
  if (!Number.isFinite(ms) || ms < 0) {
    return null
  }
  return ms
}

export async function applyHistoryDeleteRangeEffect(
  ctx: DispatchHostContext,
  e: E
): Promise<string[]> {
  const startTime = parseBound(e.start_ms)
  const endTime = parseBound(e.end_ms)
  if (startTime === null || endTime === null || endTime < startTime) {
    return [effectT(ctx, "effect.historyDeleteRange.rejected")]
  }
  try {
    await chrome.history.deleteRange({ startTime, endTime })
    return [
      effectT(ctx, "effect.historyDeleteRange.ok", {
        start: String(startTime),
        end: String(endTime)
      })
    ]
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return [effectT(ctx, "effect.historyDeleteRange.failed", { message })]
  }
}
