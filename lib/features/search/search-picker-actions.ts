export type SearchPickerActionId = "reload" | "duplicate" | "detail" | "nohlsearch"

export type SearchPickerListView = "results" | "detail" | "destination" | "actions"

export type ListSearchPickerActionsContext = {
  tabOpen: boolean
  hasDetailHits: boolean
  hlSearchPattern: string
}

const OPEN_TAB_ACTIONS: readonly SearchPickerActionId[] = ["reload", "duplicate"]

/** EN: List actions for search results (→ submenu when the entry tab is open). */
export function listSearchPickerActions(ctx: ListSearchPickerActionsContext): SearchPickerActionId[] {
  if (!ctx.tabOpen) {
    return []
  }
  const base = [...OPEN_TAB_ACTIONS]
  if (ctx.hasDetailHits) {
    base.push("detail")
  }
  if (ctx.hlSearchPattern.trim() !== "") {
    base.push("nohlsearch")
  }
  return base
}

export function searchPickerActionIsImmediate(id: SearchPickerActionId): boolean {
  return id === "reload" || id === "duplicate" || id === "nohlsearch"
}

export const SEARCH_PICKER_ACTION_MESSAGE_KEYS: Record<
  SearchPickerActionId,
  | "search.picker.action.reload"
  | "search.picker.action.duplicate"
  | "search.picker.action.detail"
  | "search.picker.action.nohlsearch"
> = {
  reload: "search.picker.action.reload",
  duplicate: "search.picker.action.duplicate",
  detail: "search.picker.action.detail",
  nohlsearch: "search.picker.action.nohlsearch"
}
