import { getRunLocale } from "../../setting/i18n/run-locale"
import { formatPeerFailureFooterLinesPreferMeta } from "../../sync/bus/peer-failure-footer.ts"
import { fetchCrossDeviceTabsList } from "../../sync/bus/fetch-cross-device-tabs.ts"
import {
  tabPickerRowsFromListResult
} from "../../picker/from-list-result/tabs-rows.ts"
import { buildTabPickerRows } from "../picker-rows"
import { createTabPickerRowsRefresh } from "../tab-picker-rows-refresh"
import type { TabPickerRow } from "../picker-rows"
import { forEachTabPickerEngine, getTabPickerEngine } from "./store"

type RowsRefreshUpdate = {
  rows: TabPickerRow[]
  peerNoticeLines?: string[]
}

/** EN: Chrome-driven (or cross-device) row rebuild → engine dispatch. */
export function createEngineTabPickerRowsRefresh() {
  return createTabPickerRowsRefresh(
    async () => {
      const updates: Record<string, RowsRefreshUpdate> = {}
      const jobs: Promise<void>[] = []
      const locale = getRunLocale()
      forEachTabPickerEngine((sessionId, engine) => {
        jobs.push(
          (async () => {
            const prev = engine.getState()
            try {
              if (prev.listScope.kind === "local") {
                updates[sessionId] = {
                  rows: await buildTabPickerRows(prev.showUrl, locale),
                  peerNoticeLines: []
                }
                return
              }
              const fetched = await fetchCrossDeviceTabsList({
                showUrl: prev.showUrl,
                locale,
                scope: prev.listScope
              })
              updates[sessionId] = {
                rows: tabPickerRowsFromListResult(fetched.result),
                peerNoticeLines: formatPeerFailureFooterLinesPreferMeta(fetched.result, locale)
              }
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
      for (const [sessionId, update] of Object.entries(updates)) {
        getTabPickerEngine(sessionId)?.dispatch({
          type: "rowsRebuilt",
          rows: update.rows,
          peerNoticeLines: update.peerNoticeLines
        })
      }
    }
  )
}
