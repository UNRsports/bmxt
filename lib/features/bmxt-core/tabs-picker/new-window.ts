export type NewWindowTabMeta = {
  id: number
  windowId: number
  index: number
}

export type ResolveNewWindowOrderContext = {
  tabs: NewWindowTabMeta[]
}

export type ResolvedNewWindowOrder = {
  orderedIds: number[]
}

export function resolveNewWindowOrder(ctx: ResolveNewWindowOrderContext): ResolvedNewWindowOrder {
  const tabs = [...ctx.tabs].sort((a, b) => {
    if (a.windowId !== b.windowId) return a.windowId - b.windowId
    if (a.index !== b.index) return a.index - b.index
    return a.id - b.id
  })
  return { orderedIds: tabs.map((t) => t.id) }
}

export function resolveTabsPickerNewWindowOrder<TContext, TResult>(context: TContext): TResult {
  return resolveNewWindowOrder(context as ResolveNewWindowOrderContext) as TResult
}
