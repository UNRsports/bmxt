/**
 * EN: Debounced schedule helper for local → Family inventory announce (no Chrome/RTC deps).
 * JA: ローカル→Family 在庫广播用のデバウンス（Chrome/RTC 非依存）。
 */

/** EN: Coalesce Chrome event storms before a single Family broadcast. */
export const LOCAL_INVENTORY_ANNOUNCE_DEBOUNCE_MS = 150

/**
 * EN: Debounced announce helper (pure scheduling; flush decides whether peers exist).
 * JA: デバウンス付き announce（スケジュールのみ。送信可否は flush で判定）。
 */
export function createLocalInventoryAnnounceScheduler(options: {
  debounceMs: number
  flush: () => void | Promise<void>
}): { schedule: () => void; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | undefined
  const schedule = (): void => {
    if (timer !== undefined) {
      clearTimeout(timer)
    }
    timer = setTimeout(() => {
      timer = undefined
      void Promise.resolve(options.flush()).catch(() => {
        /* EN: Transient RTC/storage errors must not break Chrome listeners. */
      })
    }, options.debounceMs)
  }
  const cancel = (): void => {
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }
  }
  return { schedule, cancel }
}
