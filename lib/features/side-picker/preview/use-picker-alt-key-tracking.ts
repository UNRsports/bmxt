import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from "react"
import { isPickerAltOnlyChord } from "./picker-alt-chord"

export type UsePickerAltKeyTrackingOptions = {
  enabled: boolean
  altKeyHeldRef: MutableRefObject<boolean>
  /** EN: Bump preview tick on each Alt keydown (manual mode re-preview). */
  bumpPreviewTickOnAltDown?: boolean
  setAltPreviewTick?: Dispatch<SetStateAction<number>>
  onAltKeyDown?: (e: KeyboardEvent) => void
}

/** EN: Track Alt held state and optional preview tick for picker background preview. */
export function usePickerAltKeyTracking({
  enabled,
  altKeyHeldRef,
  bumpPreviewTickOnAltDown = false,
  setAltPreviewTick,
  onAltKeyDown
}: UsePickerAltKeyTrackingOptions): void {
  useEffect(() => {
    if (!enabled) {
      altKeyHeldRef.current = false
      return
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Alt") {
        return
      }
      altKeyHeldRef.current = true
      if (bumpPreviewTickOnAltDown && !e.repeat) {
        setAltPreviewTick?.((t) => t + 1)
      }
      if (isPickerAltOnlyChord(e) && !e.repeat) {
        onAltKeyDown?.(e)
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Alt") {
        altKeyHeldRef.current = false
      }
    }

    const clearAlt = () => {
      altKeyHeldRef.current = false
    }

    window.addEventListener("keydown", onKeyDown, true)
    window.addEventListener("keyup", onKeyUp, true)
    window.addEventListener("blur", clearAlt)
    return () => {
      window.removeEventListener("keydown", onKeyDown, true)
      window.removeEventListener("keyup", onKeyUp, true)
      window.removeEventListener("blur", clearAlt)
      altKeyHeldRef.current = false
    }
  }, [altKeyHeldRef, bumpPreviewTickOnAltDown, enabled, onAltKeyDown, setAltPreviewTick])
}
