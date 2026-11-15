import type { SyncOpenUrlBatch } from "../command-line/pipe/consumers/sync-open-batches.ts"
import { sanitizeGroupTitle } from "../sync/bus/remote-open-sanitize.ts"
import type { NewGroupPaletteColor } from "./tab-picker-overlay-constants.ts"
import type { TabPickerRow } from "./picker-rows.ts"

type CurrentGroupMeta = {
  title: string | null
  color: NewGroupPaletteColor
}

/**
 * EN: Build open batches from selected local tab rows (raw group title + color in tree order).
 * JA: 選択ローカルタブから生のグループ名・色付き open バッチを作る。
 */
export function openBatchesFromSelectedLocalTabs(
  rows: readonly TabPickerRow[],
  selectedTabIds: readonly number[]
): SyncOpenUrlBatch[] {
  const selected = new Set(selectedTabIds)
  const batches: SyncOpenUrlBatch[] = []
  let currentGroup: CurrentGroupMeta | null = null
  let currentUrls: string[] = []
  let currentTabIds: Array<number | null> = []

  const flush = (): void => {
    if (currentUrls.length === 0) {
      return
    }
    batches.push({
      groupTitle: currentGroup !== null ? sanitizeGroupTitle(currentGroup.title) : null,
      groupColor: currentGroup !== null ? currentGroup.color : null,
      urls: [...currentUrls],
      tabIds: [...currentTabIds]
    })
    currentUrls = []
    currentTabIds = []
  }

  for (const row of rows) {
    if (row.kind === "window") {
      flush()
      currentGroup = null
      continue
    }
    if (row.kind === "group") {
      flush()
      // EN: Use raw chrome title, never UI wrappers like 【Work】.
      currentGroup = {
        title: row.title.trim().length > 0 ? row.title.trim() : null,
        color: row.color
      }
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
