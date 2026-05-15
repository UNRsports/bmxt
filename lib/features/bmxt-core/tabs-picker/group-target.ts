export type GroupTargetChoice = { id: number }

export type ResolveGroupTargetContext = {
  pickIndex: number
  choices: GroupTargetChoice[]
  newGroupSentinel: number
}

export type ResolvedGroupTarget = {
  createNew: boolean
  groupId: number | null
}

export function resolveGroupTarget(ctx: ResolveGroupTargetContext): ResolvedGroupTarget | null {
  const picked = ctx.choices[ctx.pickIndex]
  if (!picked) return null
  if (picked.id === ctx.newGroupSentinel) {
    return { createNew: true, groupId: null }
  }
  return { createNew: false, groupId: picked.id }
}

export function resolveTabsPickerGroupTarget<TContext, TResult>(context: TContext): TResult {
  return resolveGroupTarget(context as ResolveGroupTargetContext) as TResult
}
