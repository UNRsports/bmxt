import { useEffect, useRef, type MutableRefObject } from "react"
import {
  shouldRunPickerAltPreview,
  type PickerAltPreviewMode
} from "./picker-alt-preview-mode"

export type UsePickerAltPreviewSyncOptions = {
  enabled: boolean
  isHostPaneFocused: boolean
  mode: PickerAltPreviewMode
  altKeyHeldRef: MutableRefObject<boolean>
  altPreviewTick?: number
  /** EN: Dedupe key — change when highlight / selection changes. */
  previewKey: string
  /** EN: When true, skip preview (checked on each effect run). */
  isBlocked?: () => boolean
  runPreview: () => void | Promise<void>
}

/**
 * EN: Run `runPreview` when highlight changes and preview mode allows (auto or Alt-held).
 * JA: ハイライト変更時、auto または Alt 保持中なら `runPreview` を実行する。
 */
export function usePickerAltPreviewSync({
  enabled,
  isHostPaneFocused,
  mode,
  altKeyHeldRef,
  altPreviewTick = 0,
  previewKey,
  isBlocked,
  runPreview
}: UsePickerAltPreviewSyncOptions): void {
  const lastPreviewKeyRef = useRef("")
  const previewGenerationRef = useRef(0)
  const runPreviewRef = useRef(runPreview)
  const isBlockedRef = useRef(isBlocked)
  runPreviewRef.current = runPreview
  isBlockedRef.current = isBlocked

  useEffect(() => {
    lastPreviewKeyRef.current = ""
  }, [altPreviewTick])

  useEffect(() => {
    if (!enabled || !isHostPaneFocused) {
      lastPreviewKeyRef.current = ""
      return
    }
    if (isBlockedRef.current?.()) {
      return
    }
    if (!shouldRunPickerAltPreview(mode, altKeyHeldRef.current)) {
      return
    }
    if (previewKey.length === 0) {
      return
    }
    if (lastPreviewKeyRef.current === previewKey) {
      return
    }
    lastPreviewKeyRef.current = previewKey
    const generation = ++previewGenerationRef.current
    void Promise.resolve(runPreviewRef.current()).then(() => {
      if (generation !== previewGenerationRef.current) {
        return
      }
    })
  }, [
    altKeyHeldRef,
    altPreviewTick,
    enabled,
    isHostPaneFocused,
    isBlocked,
    mode,
    previewKey
  ])
}
