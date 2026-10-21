import { buildTabPickerRows } from "../picker-rows"
import { createTabPickerRowsRefresh } from "../tab-picker-rows-refresh"
import type { TabPickerRow } from "../picker-rows"
import { forEachTabPickerEngine, getTabPickerEngine } from "./store"

/** EN: Chrome-driven row rebuild → engine dispatch (not React parent state). */
export function createEngineTabPickerRowsRefresh() {
  return createTabPickerRowsRefresh(
    async () => {
      const updates: Record<string, TabPickerRow[]> = {}
      const jobs: Promise<void>[] = []
      forEachTabPickerEngine((sessionId, engine) => {
        jobs.push(
          (async () => {
            const prev = engine.getState()
            try {
              updates[sessionId] = await buildTabPickerRows(prev.showUrl)
            } catch {
              /* keep previous rows in engine */
            }
          })()
        )
      })
      await Promise.all(jobs)
      if (Object.keys(updates).length === 0) {
        return undefined
      }
      return updates
    },
    (updates) => {
      for (const [sessionId, rows] of Object.entries(updates)) {
        getTabPickerEngine(sessionId)?.dispatch({ type: "rowsRebuilt", rows })
      }
    }
  )
}
