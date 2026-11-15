import {
  closeLocalTabsByIds,
  tabIdsForOpenedUrls
} from "../sync/bus/close-local-after-open.ts"
import { pairLocalSourcesForOpen } from "../sync/bus/pair-sources-for-open.ts"
import { getSyncService } from "../sync/facade/sync-service.ts"
import { openBatchesFromSelectedLocalTabs } from "./open-batches-from-selected-local-tabs.ts"
import type { TabPickerRow } from "./picker-rows.ts"

export {
  resolveFamilySendDestination,
  type FamilySendDestination
} from "./resolve-family-send-dest.ts"

export { openBatchesFromSelectedLocalTabs } from "./open-batches-from-selected-local-tabs.ts"

export async function sendSelectedTabsToFamilyPeer(options: {
  deviceId: string
  rows: readonly TabPickerRow[]
  selectedTabIds: readonly number[]
  closeAfter: boolean
  peerWindowId?: number | null
}): Promise<{ ok: boolean; lines: string[]; closed: number }> {
  const batches = openBatchesFromSelectedLocalTabs(options.rows, options.selectedTabIds)
  if (batches.length === 0) {
    return { ok: false, lines: ["sync.open.noUrls"], closed: 0 }
  }
  const service = getSyncService()
  const lines: string[] = []
  let allOk = true
  const allOpened: string[] = []
  const allSources = []
  const windowId = options.peerWindowId ?? null
  for (const batch of batches) {
    const sources = pairLocalSourcesForOpen(batch.urls, batch.tabIds)
    allSources.push(...sources)
    const result = await service.openRemote(
      options.deviceId,
      batch.urls,
      batch.groupTitle,
      windowId,
      batch.groupColor
    )
    lines.push(...result.lines)
    allOpened.push(...result.openedUrls)
    if (!result.ok) {
      allOk = false
      break
    }
  }
  let closed = 0
  if (options.closeAfter && allOpened.length > 0) {
    const toClose = tabIdsForOpenedUrls(allSources, allOpened)
    closed = await closeLocalTabsByIds(toClose)
    lines.push(`sync.open.closed:${closed}`)
    if (closed > 0) {
      await service.announceTabsChanged("local_close", "tab")
    }
  }
  return { ok: allOk, lines, closed }
}
