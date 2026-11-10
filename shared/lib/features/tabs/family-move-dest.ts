import type { SyncOpenUrlBatch } from "../command-line/pipe/consumers/sync-open-batches.ts"
import {
  closeLocalTabsByIds,
  tabIdsForOpenedUrls
} from "../sync/bus/close-local-after-open.ts"
import { pairLocalSourcesForOpen } from "../sync/bus/pair-sources-for-open.ts"
import { getSyncService } from "../sync/facade/sync-service.ts"
import type { SyncLinkPeer } from "../sync/link/sync-link-status.ts"
import { getSyncLinkStatus } from "../sync/link/sync-link-status.ts"
import type { TabPickerRow } from "./picker-rows.ts"

export function listFamilyMovePeers(): SyncLinkPeer[] {
  return getSyncLinkStatus().connectedPeers
}

export function moveDestLen(visibleRowCount: number, familyPeerCount: number): number {
  return visibleRowCount + familyPeerCount
}

export function familyPeerAtMoveDest(
  moveDestHi: number,
  visibleRowCount: number,
  peers: readonly SyncLinkPeer[]
): SyncLinkPeer | null {
  if (moveDestHi < visibleRowCount) {
    return null
  }
  return peers[moveDestHi - visibleRowCount] ?? null
}

/**
 * EN: Build open batches from selected local tab rows (group titles preserved in tree order).
 * JA: 選択ローカルタブからグループ名付き open バッチを作る。
 */
export function openBatchesFromSelectedLocalTabs(
  rows: readonly TabPickerRow[],
  selectedTabIds: readonly number[]
): SyncOpenUrlBatch[] {
  const selected = new Set(selectedTabIds)
  const batches: SyncOpenUrlBatch[] = []
  let currentTitle: string | null = null
  let currentUrls: string[] = []
  let currentTabIds: Array<number | null> = []

  const flush = (): void => {
    if (currentUrls.length === 0) {
      return
    }
    batches.push({
      groupTitle: currentTitle,
      urls: [...currentUrls],
      tabIds: [...currentTabIds]
    })
    currentUrls = []
    currentTabIds = []
  }

  for (const row of rows) {
    if (row.kind === "window") {
      flush()
      currentTitle = null
      continue
    }
    if (row.kind === "group") {
      flush()
      currentTitle = row.label.trim().length > 0 ? row.label.trim() : null
      continue
    }
    if (row.kind !== "tab" || row.remote || !selected.has(row.tabId)) {
      continue
    }
    const url = row.url.trim()
    if (url.length === 0) {
      continue
    }
    currentUrls.push(url)
    currentTabIds.push(row.tabId)
  }
  flush()
  return batches
}

export async function sendSelectedTabsToFamilyPeer(options: {
  deviceId: string
  rows: readonly TabPickerRow[]
  selectedTabIds: readonly number[]
  closeAfter: boolean
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
  for (const batch of batches) {
    const sources = pairLocalSourcesForOpen(batch.urls, batch.tabIds)
    allSources.push(...sources)
    const result = await service.openRemote(options.deviceId, batch.urls, batch.groupTitle)
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
  }
  return { ok: allOk, lines, closed }
}
