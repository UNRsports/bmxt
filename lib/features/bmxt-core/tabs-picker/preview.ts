export type PreviewRow = { kind: string; tabId?: number }

export type PreviewContext = {
  hi: number
  delta: number
  visibleLen: number
  rows: PreviewRow[]
}

export type PreviewDecision = {
  nextHi: number
  activateTabId: number | null
}

function clampIndex(cur: number, delta: number, len: number): number {
  if (len === 0) return 0
  const max = len - 1
  return Math.min(max, Math.max(0, cur + delta))
}

export function resolvePreview(ctx: PreviewContext): PreviewDecision {
  const nextHi = clampIndex(ctx.hi, ctx.delta, ctx.visibleLen)
  const row = ctx.rows[nextHi]
  const activateTabId = row?.kind === "tab" ? (row.tabId ?? null) : null
  return { nextHi, activateTabId }
}

export function resolveTabsPickerPreview<TContext, TDecision>(context: TContext): TDecision {
  return resolvePreview(context as PreviewContext) as TDecision
}
