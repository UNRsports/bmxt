import type { BulkSubMode, PickerState } from "./model"

export type PickerVariant = "default" | "groupNew"
export type GroupNewPhase = "tabs" | "meta"

export type EnterContext = {
  state: PickerState
  variant: PickerVariant
  groupNewPhase: GroupNewPhase
  selectedTabCount: number
  isShift: boolean
}

export type EnterIntent =
  | "none"
  | "confirmSelection"
  | "openGroupMeta"
  | "openNewTabUrlMeta"
  | "executeClose"
  | "executeMove"
  | "executeGroup"
  | "executeNewWindow"
  | "executeReload"

export function resolveEnterIntent(ctx: EnterContext): EnterIntent {
  if (ctx.isShift) return "none"
  if (ctx.variant === "groupNew" && ctx.groupNewPhase === "tabs") {
    if (ctx.selectedTabCount > 0) return "openGroupMeta"
    return "confirmSelection"
  }
  switch (ctx.state.bulkSubMode) {
    case "newTab":
      return "openNewTabUrlMeta"
    case "close":
      return "executeClose"
    case "move":
      return "executeMove"
    case "group":
      return "executeGroup"
    case "newWindow":
      return "executeNewWindow"
    case "reload":
      return "executeReload"
    default:
      return "confirmSelection"
  }
}

export function resolveTabsPickerEnterIntent<TContext, TIntent>(context: TContext): TIntent {
  return resolveEnterIntent(context as EnterContext) as TIntent
}
