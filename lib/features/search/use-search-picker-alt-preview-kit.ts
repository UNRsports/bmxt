import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction
} from "react"
import { pickerStopEvent } from "../side-picker/interaction/picker-key-event"
import type { PlainPickerKeyboardExtensions } from "../side-picker/interaction/plain-picker-keyboard-extensions"
import { isPickerAltBlockedChord } from "../side-picker/preview/picker-alt-chord"
import { pickerAltVerticalNavDirection } from "../side-picker/preview/picker-alt-vertical-nav"
import { usePickerAltKeyTracking } from "../side-picker/preview/use-picker-alt-key-tracking"
import { usePickerAltPreviewSync } from "../side-picker/preview/use-picker-alt-preview-sync"
import type { PickerEntry } from "../side-picker/model/picker-entry"
import { useUiCopy } from "../setting"
import {
  anySearchPickerPreviewTarget,
  previewSearchPickerEntryInBackground
} from "./preview-search-picker-entry"

const PREVIEW_NOTICE_MS = 3200

export type UseSearchPickerAltPreviewKitOptions = {
  enabled: boolean
  isHostPaneFocused: boolean
  entries: readonly PickerEntry[]
  pattern: string
  matchHi: number
  hi: number
  lineCount: number
  setHi: Dispatch<SetStateAction<number>>
  searchMode: boolean
  commandMode: boolean
  baseExtensions?: PlainPickerKeyboardExtensions
}

export type UseSearchPickerAltPreviewKitResult = {
  altKeyHeldRef: MutableRefObject<boolean>
  mergedExtensions: PlainPickerKeyboardExtensions
  previewNotice: string | null
}

/** EN: Alt+↑↓ background preview for search results (always manual / Alt-gated). */
export function useSearchPickerAltPreviewKit({
  enabled,
  isHostPaneFocused,
  entries,
  pattern,
  matchHi,
  hi,
  lineCount,
  setHi,
  searchMode,
  commandMode,
  baseExtensions
}: UseSearchPickerAltPreviewKitOptions): UseSearchPickerAltPreviewKitResult {
  const uiCopy = useUiCopy()
  const altKeyHeldRef = useRef(false)
  const [altPreviewTick, setAltPreviewTick] = useState(0)
  const [hasPreviewTarget, setHasPreviewTarget] = useState(false)
  const [previewNotice, setPreviewNotice] = useState<string | null>(null)
  const noticeTimerRef = useRef<number | null>(null)
  const entriesRef = useRef(entries)
  const patternRef = useRef(pattern)
  const matchHiRef = useRef(matchHi)
  const hiRef = useRef(hi)
  entriesRef.current = entries
  patternRef.current = pattern
  matchHiRef.current = matchHi
  hiRef.current = hi

  useEffect(() => {
    if (!enabled || entries.length === 0) {
      setHasPreviewTarget(false)
      return
    }
    let cancelled = false
    void anySearchPickerPreviewTarget(entries).then((any) => {
      if (!cancelled) {
        setHasPreviewTarget(any)
      }
    })
    return () => {
      cancelled = true
    }
  }, [enabled, entries])

  const showNoPreviewTargetNotice = useCallback(() => {
    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current)
    }
    setPreviewNotice(uiCopy.t("search.picker.noPreviewTarget"))
    noticeTimerRef.current = window.setTimeout(() => {
      setPreviewNotice(null)
      noticeTimerRef.current = null
    }, PREVIEW_NOTICE_MS)
  }, [uiCopy])

  const onAltKeyDown = useCallback(() => {
    if (!hasPreviewTarget) {
      showNoPreviewTargetNotice()
    }
  }, [hasPreviewTarget, showNoPreviewTargetNotice])

  usePickerAltKeyTracking({
    enabled,
    altKeyHeldRef,
    bumpPreviewTickOnAltDown: true,
    setAltPreviewTick,
    onAltKeyDown
  })

  const entry = entries[hi]
  const previewKey =
    enabled && entry ? `${hi}:${entry.id}:${matchHi}:${pattern}` : ""

  const runPreview = useCallback(async () => {
    const index = hiRef.current
    const row = entriesRef.current[index]
    if (!row) {
      return
    }
    await previewSearchPickerEntryInBackground(
      row,
      matchHiRef.current,
      patternRef.current
    )
  }, [])

  usePickerAltPreviewSync({
    enabled: enabled && lineCount > 0,
    isHostPaneFocused,
    mode: "manual",
    altKeyHeldRef,
    altPreviewTick,
    previewKey,
    runPreview
  })

  const customVerticalNav = useCallback(
    (e: KeyboardEvent): boolean => {
      if (!enabled || searchMode || commandMode) {
        return false
      }
      if (isPickerAltBlockedChord(e)) {
        return false
      }
      const navDir = pickerAltVerticalNavDirection(e, altKeyHeldRef)
      if (navDir === null) {
        return false
      }
      const ev = e as KeyboardEvent & { isComposing?: boolean }
      if (ev.isComposing || lineCount === 0) {
        return false
      }
      pickerStopEvent(e)
      if (navDir === "down") {
        setHi((h) => Math.min(h + 1, lineCount - 1))
      } else {
        setHi((h) => Math.max(h - 1, 0))
      }
      return true
    },
    [commandMode, enabled, lineCount, searchMode, setHi]
  )

  const mergedExtensions = useMemo((): PlainPickerKeyboardExtensions => {
    return {
      ...baseExtensions,
      customVerticalNav: enabled
        ? (e) => {
            if (customVerticalNav(e)) {
              return true
            }
            return baseExtensions?.customVerticalNav?.(e) ?? false
          }
        : baseExtensions?.customVerticalNav
    }
  }, [baseExtensions, customVerticalNav, enabled])

  return { altKeyHeldRef, mergedExtensions, previewNotice }
}
