import type { TabPickerState } from "../../side-picker/session/tab-picker-state"
import { emptyTabPickerInteractiveSnapshot } from "../../side-picker/session/tab-picker-state"
import type { TabPickerEngineState } from "./types"

export function createInitialTabPickerEngineState(
  input: {
    rows: TabPickerEngineState["rows"]
    showUrl: boolean
    initialHi: number
    variant?: TabPickerEngineState["variant"]
    interactive?: TabPickerState["interactive"]
  }
): TabPickerEngineState {
  const interactive = input.interactive ?? emptyTabPickerInteractiveSnapshot()
  const hi = input.initialHi
  const atHi = input.rows[hi]
  const activeTabId =
    interactive.anchorTabId ??
    (atHi?.kind === "tab"
      ? atHi.tabId
      : (() => {
          const firstActive = input.rows.find((row) => row.kind === "tab" && row.active)
          return firstActive?.kind === "tab" ? firstActive.tabId : null
        })())

  const anchorTabId = interactive.anchorTabId ?? activeTabId

  return {
    rows: input.rows,
    showUrl: input.showUrl,
    variant: input.variant ?? "default",
    initialHi: input.initialHi,
    anchorTabId,
    hi,
    moveDestHi: hi,
    markedKind: interactive.markedKind,
    markedTabIds: [...interactive.markedTabIds],
    markedWindowIds: [...interactive.markedWindowIds],
    markedGroupKeys: [...interactive.markedGroupKeys],
    bulkSubMode: null,
    filterQuery: "",
    searchMode: false,
    hlSearchPattern: interactive.hlSearchPattern,
    commandMode: false,
    commandBuffer: "",
    commandListingHint: false,
    activeTabId,
    groupChoices: [],
    groupPickIndex: 0,
    groupNewPhase: "tabs",
    newGroupTitle: "",
    newGroupColorIndex: 0,
    newTabUrlWindowId: null,
    newTabUrl: "",
    editPanel: null,
    editTitle: "",
    actionMenuPanel: null
  }
}

export function hydrateTabPickerEngineState(picker: TabPickerState): TabPickerEngineState {
  return createInitialTabPickerEngineState({
    rows: picker.rows,
    showUrl: picker.showUrl,
    initialHi: picker.initialHi,
    variant: picker.variant,
    interactive: picker.interactive
  })
}
