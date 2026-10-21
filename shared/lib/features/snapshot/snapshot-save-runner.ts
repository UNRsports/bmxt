import type { UiLocale } from "../setting/locale"
import { snapshotSaveLogLinesForResult } from "./snapshot-save-log-lines"
import { saveSnapshotFromTab } from "./snapshot-save-tab"

export async function runSnapshotSaveForTabIds(options: {
  sessionId: string
  locale: UiLocale
  tabIds: readonly number[]
  appendLogLines: (lines: string[]) => void | Promise<void>
}): Promise<void> {
  if (options.tabIds.length === 0) {
    return
  }
  const lines: string[] = []
  for (const id of options.tabIds) {
    const cmdLine = `snapshot -save ${id}`
    lines.push(`> ${cmdLine}`)
    const result = await saveSnapshotFromTab(String(id), { sessionId: options.sessionId })
    lines.push(...snapshotSaveLogLinesForResult(options.locale, result))
  }
  await options.appendLogLines(lines)
}
