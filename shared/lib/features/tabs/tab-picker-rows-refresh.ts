import { getJobRunner, TERMINAL_JOB_SCOPE } from "../job"

const DEBOUNCE_MS = 80

export type TabPickerRowsRefreshHandles = {
  refreshTabPickerRows: () => Promise<void>
  scheduleTabPickerRowsRefresh: () => void
}

/**
 * EN: Coalesce concurrent row rebuilds (latest generation wins) + debounced schedule.
 * JA: 行再構築をジョブランナー経由で coalesce する。
 */
export function createTabPickerRowsRefresh<T>(
  rebuild: () => Promise<T | undefined>,
  apply: (value: T) => void
): TabPickerRowsRefreshHandles {
  const runner = getJobRunner(TERMINAL_JOB_SCOPE)
  let debounceTimer: ReturnType<typeof setTimeout> | undefined

  const refreshTabPickerRows = async () => {
    await runner.startCoalesced(
      "tab-picker-refresh",
      async (job) => {
        const result = await rebuild()
        if (job.cancelled || result === undefined) {
          return undefined
        }
        apply(result)
        return result
      },
      { persist: false }
    )
  }

  const scheduleTabPickerRowsRefresh = () => {
    if (debounceTimer !== undefined) {
      clearTimeout(debounceTimer)
    }
    debounceTimer = setTimeout(() => {
      debounceTimer = undefined
      void refreshTabPickerRows()
    }, DEBOUNCE_MS)
  }

  return { refreshTabPickerRows, scheduleTabPickerRowsRefresh }
}
