/** EN: Hold duration (ms) for nav typing mode Esc / Alt actions. */

export const NAV_KEY_HOLD_MS = 500

export type NavKeyHoldHandlers = {
  onEscapeHold: () => void
  onAltHold: () => void
}

/**
 * EN: Capture-phase keydown/keyup for Escape / Alt long-press (typing mode exit).
 * JA: Esc / Alt 長押し検出。短押し Alt は typing 中は何もしない。
 */
export function attachNavKeyHold(
  enabled: boolean,
  handlers: NavKeyHoldHandlers
): () => void {
  if (!enabled) {
    return () => {}
  }

  const holdTimers = new Map<string, ReturnType<typeof setTimeout>>()
  const fired = new Set<string>()

  const clearHold = (key: string) => {
    const t = holdTimers.get(key)
    if (t !== undefined) {
      clearTimeout(t)
      holdTimers.delete(key)
    }
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) {
      return
    }
    if (e.key !== "Escape" && e.key !== "Alt") {
      return
    }
    clearHold(e.key)
    fired.delete(e.key)
    e.preventDefault()
    e.stopPropagation()
    const key = e.key
    holdTimers.set(
      key,
      setTimeout(() => {
        holdTimers.delete(key)
        fired.add(key)
        if (key === "Escape") {
          handlers.onEscapeHold()
        } else {
          handlers.onAltHold()
        }
      }, NAV_KEY_HOLD_MS)
    )
  }

  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key !== "Escape" && e.key !== "Alt") {
      return
    }
    clearHold(e.key)
    if (!fired.has(e.key)) {
      e.preventDefault()
      e.stopPropagation()
    }
    fired.delete(e.key)
  }

  window.addEventListener("keydown", onKeyDown, true)
  window.addEventListener("keyup", onKeyUp, true)
  return () => {
    window.removeEventListener("keydown", onKeyDown, true)
    window.removeEventListener("keyup", onKeyUp, true)
    for (const t of holdTimers.values()) {
      clearTimeout(t)
    }
    holdTimers.clear()
    fired.clear()
  }
}
