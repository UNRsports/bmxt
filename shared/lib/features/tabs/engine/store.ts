import type { TabPickerState } from "../../side-picker/session/tab-picker-state"
import { projectTabPickerEngineToParentState } from "./persist"
import { reduceTabPickerEngine } from "./reducer"
import type {
  TabPickerEngineAction,
  TabPickerEngineDispatch,
  TabPickerEngineState,
  TabPickerEngineStore
} from "./types"

export type TabPickerEngineProjectedChangeHandler = (
  sessionId: string,
  projected: TabPickerState
) => void

const engines = new Map<string, TabPickerEngineStore>()
let projectedChangeHandler: TabPickerEngineProjectedChangeHandler | null = null

export function setTabPickerEngineProjectedChangeHandler(
  handler: TabPickerEngineProjectedChangeHandler | null
): void {
  projectedChangeHandler = handler
}

function createTabPickerEngineStore(
  sessionId: string,
  initial: TabPickerEngineState
): TabPickerEngineStore {
  let state = initial
  const listeners = new Set<() => void>()

  const notify = (): void => {
    for (const listener of listeners) {
      listener()
    }
    projectedChangeHandler?.(sessionId, projectTabPickerEngineToParentState(state))
  }

  const dispatch: TabPickerEngineDispatch = (action: TabPickerEngineAction) => {
    const next = reduceTabPickerEngine(state, action)
    if (next === state) {
      return
    }
    state = next
    notify()
  }

  return {
    sessionId,
    getState: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    dispatch
  }
}

export function mountTabPickerEngine(
  sessionId: string,
  initial: TabPickerEngineState
): TabPickerEngineStore {
  unmountTabPickerEngine(sessionId)
  const store = createTabPickerEngineStore(sessionId, initial)
  engines.set(sessionId, store)
  return store
}

export function unmountTabPickerEngine(sessionId: string): void {
  engines.delete(sessionId)
}

export function getTabPickerEngine(sessionId: string): TabPickerEngineStore | undefined {
  return engines.get(sessionId)
}

export function isTabPickerEngineMounted(sessionId: string): boolean {
  return engines.has(sessionId)
}

export function forEachTabPickerEngine(
  fn: (sessionId: string, store: TabPickerEngineStore) => void
): void {
  for (const [sessionId, store] of engines) {
    fn(sessionId, store)
  }
}

export function listMountedTabPickerEngineSessionIds(): string[] {
  return [...engines.keys()]
}
