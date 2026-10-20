import { useCallback, useRef, useState } from "react"
import { usePickerAltKeyTracking } from "../side-picker/preview/use-picker-alt-key-tracking"
import { usePickerAltPreviewSync } from "../side-picker/preview/use-picker-alt-preview-sync"
import type { DomPageActiveMode } from "./page-active-setting"
import { jumpDomListTargetToPath } from "./dom-scroll-to-path"

type Options = {
  enabled: boolean
  isHostPaneFocused: boolean
  jumpActiveMode: DomPageActiveMode
  hi: number
  jumpPaths: readonly (readonly number[] | null)[]
  targetTabId?: number
}

/** EN: Auto/manual page jump preview while moving DOM picker highlight. */
export function useDomPickerJumpPreview({
  enabled,
  isHostPaneFocused,
  jumpActiveMode,
  hi,
  jumpPaths,
  targetTabId
}: Options): void {
  const altKeyHeldRef = useRef(false)
  const [altPreviewTick, setAltPreviewTick] = useState(0)
  const jumpPathsRef = useRef(jumpPaths)
  const targetTabIdRef = useRef(targetTabId)
  const hiRef = useRef(hi)

  jumpPathsRef.current = jumpPaths
  targetTabIdRef.current = targetTabId
  hiRef.current = hi

  usePickerAltKeyTracking({
    enabled,
    altKeyHeldRef,
    bumpPreviewTickOnAltDown: jumpActiveMode === "manual",
    setAltPreviewTick
  })

  const runPreview = useCallback(async () => {
    const path = jumpPathsRef.current[hiRef.current]
    const tabId = targetTabIdRef.current
    if (path == null || tabId === undefined) {
      return
    }
    await jumpDomListTargetToPath(tabId, path, { focusWindow: false })
  }, [])

  const previewKey =
    enabled && targetTabId !== undefined && jumpPaths[hi] != null
      ? `${targetTabId}:${hi}:${jumpPaths[hi]!.join(".")}`
      : ""

  usePickerAltPreviewSync({
    enabled: enabled && jumpPaths.length > 0,
    isHostPaneFocused,
    mode: jumpActiveMode,
    altKeyHeldRef,
    altPreviewTick,
    previewKey,
    isBlocked: () => jumpPathsRef.current[hiRef.current] == null,
    runPreview
  })
}
