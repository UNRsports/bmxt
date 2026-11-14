import { useEffect, useRef, type MutableRefObject } from "react"
import {
  shouldRunPickerAltPreview,
  type PickerAltPreviewMode
} from "./picker-alt-preview-mode"

/** EN: Coalesce rapid j/k preview into the page (heavy DOMs). */
export const PICKER_ALT_PREVIEW_DEBOUNCE_MS = 100

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
  /** EN: Debounce before injecting into the page (default 100ms). */
  debounceMs?: number
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
  runPreview,
  debounceMs = PICKER_ALT_PREVIEW_DEBOUNCE_MS
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

    const generation = ++previewGenerationRef.current
    const timer = window.setTimeout(() => {
      if (generation !== previewGenerationRef.current) {
        return
      }
      if (isBlockedRef.current?.()) {
        return
      }
      if (!shouldRunPickerAltPreview(mode, altKeyHeldRef.current)) {
        return
      }
      lastPreviewKeyRef.current = previewKey
      void Promise.resolve(runPreviewRef.current()).then(() => {
        if (generation !== previewGenerationRef.current) {
          return
        }
      })
    }, Math.max(0, debounceMs))

    return () => {
      window.clearTimeout(timer)
    }
  }, [
    altKeyHeldRef,
    altPreviewTick,
    debounceMs,
    enabled,
    isHostPaneFocused,
    isBlocked,
    mode,
    previewKey
  ])
}
