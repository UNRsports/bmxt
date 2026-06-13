import { reducePickerState } from "../state-machine"
import type { TabPickerEngineAction, TabPickerEngineState } from "./types"

function pickerSlice(state: TabPickerEngineState) {
  return {
    hi: state.hi,
    moveDestHi: state.moveDestHi,
    markedKind: state.markedKind,
    markedTabIds: state.markedTabIds,
    markedWindowIds: state.markedWindowIds,
    markedGroupKeys: state.markedGroupKeys,
    bulkSubMode: state.bulkSubMode
  }
}

export function reduceTabPickerEngine(
  state: TabPickerEngineState,
  action: TabPickerEngineAction
): TabPickerEngineState {
  switch (action.type) {
    case "rowsRebuilt":
      if (action.rows === state.rows) {
        return state
      }
      return { ...state, rows: action.rows }
    case "reducer": {
      const next = reducePickerState(pickerSlice(state), action.event)
      if (
        next.hi === state.hi &&
        next.moveDestHi === state.moveDestHi &&
        next.markedKind === state.markedKind &&
        next.markedTabIds === state.markedTabIds &&
        next.markedWindowIds === state.markedWindowIds &&
        next.markedGroupKeys === state.markedGroupKeys &&
        next.bulkSubMode === state.bulkSubMode
      ) {
        return state
      }
      return { ...state, ...next }
    }
    case "reducerSequence": {
      let slice = pickerSlice(state)
      for (const event of action.events) {
        slice = reducePickerState(slice, event)
      }
      if (
        slice.hi === state.hi &&
        slice.moveDestHi === state.moveDestHi &&
        slice.markedKind === state.markedKind &&
        slice.markedTabIds === state.markedTabIds &&
        slice.markedWindowIds === state.markedWindowIds &&
        slice.markedGroupKeys === state.markedGroupKeys &&
        slice.bulkSubMode === state.bulkSubMode
      ) {
        return state
      }
      return { ...state, ...slice }
    }
    case "update": {
      const next = action.updater(state)
      return next === state ? state : next
    }
    default:
      return state
  }
}
