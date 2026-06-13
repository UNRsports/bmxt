const SELF_ACTIVATION_TTL_MS = 500

const pendingSelfActivations = new Set<number>()
const expiryTimers = new Map<number, ReturnType<typeof setTimeout>>()

/** EN: Mark that BMXt will activate this tab (suppress redundant picker refresh). */
export function markPickerSelfTabActivation(tabId: number): void {
  pendingSelfActivations.add(tabId)
  const prev = expiryTimers.get(tabId)
  if (prev !== undefined) {
    clearTimeout(prev)
  }
  expiryTimers.set(
    tabId,
    setTimeout(() => {
      pendingSelfActivations.delete(tabId)
      expiryTimers.delete(tabId)
    }, SELF_ACTIVATION_TTL_MS)
  )
}

/** EN: True when `onActivated` was caused by BMXt preview sync; consumes the mark. */
export function consumePickerSelfTabActivation(tabId: number): boolean {
  if (!pendingSelfActivations.has(tabId)) {
    return false
  }
  pendingSelfActivations.delete(tabId)
  const timer = expiryTimers.get(tabId)
  if (timer !== undefined) {
    clearTimeout(timer)
    expiryTimers.delete(tabId)
  }
  return true
}
