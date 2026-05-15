export type TargetRow = {
  kind: string
  tabId?: number
  windowId?: number
  groupId?: number | null
}

export type ResolveTargetContext = {
  moveDestHi: number
  rows: TargetRow[]
}

export type ResolvedTarget = {
  kind: string
  tabId: number | null
  windowId: number | null
  groupId: number | null
}

export function resolveTarget(ctx: ResolveTargetContext): ResolvedTarget | null {
  const row = ctx.rows[ctx.moveDestHi]
  if (!row) return null
  return {
    kind: row.kind,
    tabId: row.tabId ?? null,
    windowId: row.windowId ?? null,
    groupId: row.groupId ?? null
  }
}

export function resolveTabsPickerTarget<TContext, TResult>(context: TContext): TResult {
  return resolveTarget(context as ResolveTargetContext) as TResult
}
