const DEBOUNCE_MS = 80

export type TabPickerRowsRefreshHandles = {
  refreshTabPickerRows: () => Promise<void>
  scheduleTabPickerRowsRefresh: () => void
}

/**
 * EN: Coalesce concurrent row rebuilds (latest generation wins) + debounced schedule.
 */
export function createTabPickerRowsRefresh<T>(
  rebuild: () => Promise<T | undefined>,
  apply: (value: T) => void
): TabPickerRowsRefreshHandles {
  let generation = 0
  let debounceTimer: ReturnType<typeof setTimeout> | undefined

  const refreshTabPickerRows = async () => {
    const gen = ++generation
    const result = await rebuild()
    if (gen !== generation || result === undefined) {
      return
    }
    apply(result)
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
