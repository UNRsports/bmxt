import type { SelectKind } from "./model"

export type ConfirmRow = {
  kind: string
  tabId?: number
  windowId?: number
  groupId?: number | null
}

export type ResolveConfirmContext = {
  hi: number
  rows: ConfirmRow[]
}

export type ConfirmPlan =
  | { kind: "activateTab"; tabId: number; windowId: number }
  | { kind: "focusWindow"; windowId: number }
  | { kind: "activateFromGroup"; windowId: number; groupId: number | null }

export function resolveConfirmPlan(ctx: ResolveConfirmContext): ConfirmPlan | null {
  const row = ctx.rows[ctx.hi]
  if (!row) return null
  switch (row.kind) {
    case "tab":
      if (row.tabId === undefined || row.windowId === undefined) return null
      return { kind: "activateTab", tabId: row.tabId, windowId: row.windowId }
    case "window":
      if (row.windowId === undefined) return null
      return { kind: "focusWindow", windowId: row.windowId }
    case "group":
      if (row.windowId === undefined) return null
      return {
        kind: "activateFromGroup",
        windowId: row.windowId,
        groupId: row.groupId ?? null
      }
    default:
      return null
  }
}

export type ResolveMovePlanContext = {
  markedKind: SelectKind | null
  targetKind: string
  targetTabId: number | null
  targetWindowId: number | null
  targetGroupId: number | null
  sourceTabGroupIds?: number[]
}

export type MovePlan = {
  targetKind: string
  targetTabId: number | null
  targetWindowId: number | null
  targetGroupId: number | null
  shouldUngroupAfterMove: boolean
  shouldGroupToTargetAfterMove: boolean
  tabGroupIdsToMoveAsUnits: number[]
}

export function resolveMovePlan(ctx: ResolveMovePlanContext): MovePlan | null {
  const isGroupSelection = ctx.markedKind === "group"
  let shouldUngroupAfterMove = false
  let shouldGroupToTargetAfterMove = false
  switch (ctx.targetKind) {
    case "tab":
      shouldUngroupAfterMove = ctx.targetGroupId === null
      shouldGroupToTargetAfterMove = ctx.targetGroupId !== null
      break
    case "window":
      break
    case "group":
      shouldUngroupAfterMove = ctx.targetGroupId === null
      shouldGroupToTargetAfterMove = ctx.targetGroupId !== null
      break
    default:
      return null
  }
  const tabGroupIdsToMoveAsUnits =
    ctx.targetKind === "window" && isGroupSelection ? [...(ctx.sourceTabGroupIds ?? [])] : []
  return {
    targetKind: ctx.targetKind,
    targetTabId: ctx.targetTabId,
    targetWindowId: ctx.targetWindowId,
    targetGroupId: ctx.targetGroupId,
    shouldUngroupAfterMove,
    shouldGroupToTargetAfterMove,
    tabGroupIdsToMoveAsUnits
  }
}

export function resolveTabsPickerConfirmPlan<TContext, TResult>(context: TContext): TResult {
  return resolveConfirmPlan(context as ResolveConfirmContext) as TResult
}

export function resolveTabsPickerMovePlan<TContext, TResult>(context: TContext): TResult {
  return resolveMovePlan(context as ResolveMovePlanContext) as TResult
}
