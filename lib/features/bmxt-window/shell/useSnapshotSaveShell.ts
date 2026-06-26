import { useCallback } from "react"
import { parseSnapshotSaveLine } from "../../snapshot/snapshot-save-input"
import { snapshotSaveLogLinesForResult } from "../../snapshot/snapshot-save-log-lines"
import { runSnapshotSaveForTabIds } from "../../snapshot/snapshot-save-runner"
import { saveSnapshotFromTab } from "../../snapshot/snapshot-save-tab"
import type { UiLocale } from "../../setting/locale"

export type UseSnapshotSaveShellOptions = {
  sessionId: string
  uiLocale: UiLocale
  appendLogLines: (lines: string[]) => Promise<void>
}

export function useSnapshotSaveShell(options: UseSnapshotSaveShellOptions) {
  const runSnapshotSave = useCallback(
    async (trimmed: string, tabId?: string) => {
      const parsed = parseSnapshotSaveLine(trimmed)
      if (!parsed) {
        return
      }
      const resolvedTabId = tabId ?? parsed.tabId
      await options.appendLogLines([`> ${trimmed}`])
      const result = await saveSnapshotFromTab(resolvedTabId, { sessionId: options.sessionId })
      await options.appendLogLines(snapshotSaveLogLinesForResult(options.uiLocale, result))
    },
    [options]
  )

  const runSnapshotSaveForTabIdsFromShell = useCallback(
    async (tabIds: readonly number[]) => {
      await runSnapshotSaveForTabIds({
        sessionId: options.sessionId,
        locale: options.uiLocale,
        tabIds,
        appendLogLines: options.appendLogLines
      })
    },
    [options]
  )

  return { runSnapshotSave, runSnapshotSaveForTabIds: runSnapshotSaveForTabIdsFromShell }
}
