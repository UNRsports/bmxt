import { useCallback } from "react"
import { parseSnapshotSaveLine } from "../../snapshot/snapshot-save-input"
import { saveSnapshotFromTab } from "../../snapshot/snapshot-save-tab"
import type { UiLocale } from "../../setting/locale"
import { tCmd } from "../../setting/i18n/ns/cmd"

export type UseSnapshotSaveShellOptions = {
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
      const result = await saveSnapshotFromTab(resolvedTabId)
      if (result.ok === false) {
        await options.appendLogLines([
          tCmd("cmd.snapshot.save.failed", options.uiLocale, { message: result.message })
        ])
        return
      }
      await options.appendLogLines([
        tCmd("cmd.snapshot.save.done", options.uiLocale, {
          path: result.result.path,
          title: result.result.title
        })
      ])
    },
    [options]
  )

  return { runSnapshotSave }
}
