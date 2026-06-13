import { useCallback, useSyncExternalStore, type Dispatch, type SetStateAction } from "react"
import type { TabPickerEngineDispatch, TabPickerEngineState } from "./types"
import { getTabPickerEngine } from "./store"

const FALLBACK_STATE: TabPickerEngineState = {
  rows: [],
  showUrl: false,
  variant: "default",
  initialHi: 0,
  anchorTabId: null,
  hi: 0,
  moveDestHi: 0,
  markedKind: null,
  markedTabIds: [],
  markedWindowIds: [],
  markedGroupKeys: [],
  bulkSubMode: null,
  filterQuery: "",
  searchMode: false,
  hlSearchPattern: "",
  commandMode: false,
  commandBuffer: "",
  commandListingHint: false,
  activeTabId: null,
  groupChoices: [],
  groupPickIndex: 0,
  groupNewPhase: "tabs",
  newGroupTitle: "",
  newGroupColorIndex: 0,
  newTabUrlWindowId: null,
  newTabUrl: "",
  editPanel: null,
  editTitle: ""
}

function noopSubscribe(): () => void {
  return () => {}
}

/** EN: Subscribe to the session tab picker engine (Chrome → store → UI). */
export function useTabPickerEngineState(sessionId: string): {
  state: TabPickerEngineState
  dispatch: TabPickerEngineDispatch
} | null {
  const engine = getTabPickerEngine(sessionId)
  const subscribe = useCallback(
    (onStoreChange: () => void) => engine?.subscribe(onStoreChange) ?? noopSubscribe(),
    [engine]
  )
  const getSnapshot = useCallback(() => engine?.getState() ?? FALLBACK_STATE, [engine])
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  if (!engine) {
    return null
  }
  return { state, dispatch: engine.dispatch }
}

export function createTabPickerEngineFieldSetter<K extends keyof TabPickerEngineState>(
  dispatch: TabPickerEngineDispatch,
  field: K
): Dispatch<SetStateAction<TabPickerEngineState[K]>> {
  return (value) => {
    dispatch({
      type: "update",
      updater: (prev) => {
        const nextValue =
          typeof value === "function"
            ? (value as (prev: TabPickerEngineState[K]) => TabPickerEngineState[K])(prev[field])
            : value
        if (Object.is(nextValue, prev[field])) {
          return prev
        }
        return { ...prev, [field]: nextValue }
      }
    })
  }
}

export function createTabPickerEnginePatchUpdater(
  dispatch: TabPickerEngineDispatch
): (updater: (prev: TabPickerEngineState) => TabPickerEngineState) => void {
  return (updater) => {
    dispatch({ type: "update", updater })
  }
}
