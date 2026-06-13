import { useLayoutEffect, useRef, useState } from "react"
import type { PickerSlotId, SessionPickerState } from "../session/session-pickers"

/** EN: Must match `.bmxt-picker-rail` flex transition in bmxt-ui.css. */
export const PICKER_RAIL_MS = 280

export function usePickerRailPresence(
  openPickers: readonly PickerSlotId[],
  sessionPickers: SessionPickerState
): {
  railPickers: readonly PickerSlotId[]
  railExpanded: boolean
  displaySessionPickers: SessionPickerState
} {
  const bootstrappedRef = useRef(false)
  const prevOpenRef = useRef(openPickers)
  const prevSessionPickersRef = useRef(sessionPickers)
  const frozenSessionPickersRef = useRef<SessionPickerState | null>(null)
  const [railPickers, setRailPickers] = useState<readonly PickerSlotId[]>(openPickers)
  const [railExpanded, setRailExpanded] = useState(openPickers.length > 0)

  if (openPickers.length === 0 && prevOpenRef.current.length > 0) {
    frozenSessionPickersRef.current = prevSessionPickersRef.current
  }
  if (openPickers.length > 0) {
    frozenSessionPickersRef.current = null
  }

  const displaySessionPickers =
    openPickers.length > 0
      ? sessionPickers
      : (frozenSessionPickersRef.current ?? sessionPickers)

  prevOpenRef.current = openPickers
  prevSessionPickersRef.current = sessionPickers

  useLayoutEffect(() => {
    let closeTimer: number | null = null
    let enterRaf: number | null = null

    const clearEnterRaf = (): void => {
      if (enterRaf !== null) {
        cancelAnimationFrame(enterRaf)
        enterRaf = null
      }
    }

    if (!bootstrappedRef.current) {
      bootstrappedRef.current = true
      setRailPickers(openPickers)
      setRailExpanded(openPickers.length > 0)
      return
    }

    if (openPickers.length > 0) {
      const openingFromClosed = railPickers.length === 0
      setRailPickers(openPickers)
      clearEnterRaf()
      if (openingFromClosed) {
        setRailExpanded(false)
        enterRaf = requestAnimationFrame(() => {
          enterRaf = requestAnimationFrame(() => {
            enterRaf = null
            setRailExpanded(true)
          })
        })
      } else {
        setRailExpanded(true)
      }
      return () => {
        clearEnterRaf()
      }
    }

    if (railPickers.length > 0) {
      setRailExpanded(false)
      closeTimer = window.setTimeout(() => {
        setRailPickers([])
        frozenSessionPickersRef.current = null
      }, PICKER_RAIL_MS)
    }

    return () => {
      clearEnterRaf()
      if (closeTimer !== null) {
        window.clearTimeout(closeTimer)
      }
    }
  }, [openPickers, railPickers.length])

  return { railPickers, railExpanded, displaySessionPickers }
}
