import type { TabPickerState } from "../../side-picker/session/tab-picker-state"
import { hydrateTabPickerEngineState } from "./hydrate"
import { projectTabPickerEngineToParentState } from "./persist"
import {
  isTabPickerEngineMounted,
  listMountedTabPickerEngineSessionIds,
  mountTabPickerEngine,
  unmountTabPickerEngine
} from "./store"

/** EN: Mount engine and return parent projection for `pickersBySession`. */
export function openTabPickerEngineForSession(
  sessionId: string,
  picker: Omit<TabPickerState, "interactive"> & { interactive?: TabPickerState["interactive"] }
): TabPickerState {
  const initial = hydrateTabPickerEngineState(picker as TabPickerState)
  mountTabPickerEngine(sessionId, initial)
  return projectTabPickerEngineToParentState(initial)
}

export function closeTabPickerEngineForSession(sessionId: string): void {
  unmountTabPickerEngine(sessionId)
}

/** EN: Mount engines for restored/open pickers; unmount when slot closed or leaf pruned. */
export function reconcileTabPickerEngines(map: Record<string, { tabs: TabPickerState | null }>): void {
  const desired = new Set<string>()
  for (const [sessionId, pickers] of Object.entries(map)) {
    if (pickers.tabs) {
      desired.add(sessionId)
      if (!isTabPickerEngineMounted(sessionId)) {
        mountTabPickerEngine(sessionId, hydrateTabPickerEngineState(pickers.tabs))
      }
    }
  }
  for (const sessionId of listMountedTabPickerEngineSessionIds()) {
    if (!desired.has(sessionId)) {
      unmountTabPickerEngine(sessionId)
    }
  }
}
