import type {
  TabPickerInteractiveSnapshot,
  TabPickerState
} from "../../side-picker/session/tab-picker-state"
import type { TabPickerEngineState } from "./types"

export function interactiveSnapshotFromEngineState(
  state: TabPickerEngineState
): TabPickerInteractiveSnapshot {
  return {
    anchorTabId: state.anchorTabId,
    markedKind: state.markedKind,
    markedTabIds: state.markedTabIds,
    markedWindowIds: state.markedWindowIds,
    markedGroupKeys: state.markedGroupKeys,
    hlSearchPattern: state.hlSearchPattern
  }
}

/** EN: Serializable parent projection for persistence and shell coordination. */
export function projectTabPickerEngineToParentState(
  state: TabPickerEngineState
): TabPickerState {
  return {
    rows: state.rows,
    showUrl: state.showUrl,
    initialHi: state.initialHi,
    variant: state.variant,
    interactive: interactiveSnapshotFromEngineState(state)
  }
}
