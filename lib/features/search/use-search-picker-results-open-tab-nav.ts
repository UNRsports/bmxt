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
import {
  isPhysicalArrowDown,
  isPhysicalArrowUp,
  verticalNavDirection
} from "../side-picker/interaction/picker-vertical-nav"
import type { PlainPickerKeyboardExtensions } from "../side-picker/interaction/plain-picker-keyboard-extensions"
import {
  isPickerCtrlBlockedChord,
  isPickerCtrlOnlyChord
} from "../side-picker/preview/picker-ctrl-chord"
import type { PickerEntry } from "../side-picker/model/picker-entry"
import { useUiCopy } from "../setting"
import {
  adjacentSearchPickerPreviewHi,
  searchPickerPreviewScrollAnimated
} from "./search-picker-preview-nav"
import { listSearchPickerPreviewTargetIndices } from "./search-picker-preview-targets"
import type { SearchPickerListScrollHint } from "./use-search-picker-alt-preview-kit"

export type UseSearchPickerResultsOpenTabNavOptions = {
  enabled: boolean
  entries: readonly PickerEntry[]
  hi: number
  lineCount: number
  setHi: Dispatch<SetStateAction<number>>
  searchMode: boolean
  commandMode: boolean
  listScrollHintRef: MutableRefObject<SearchPickerListScrollHint | null>
  baseExtensions?: PlainPickerKeyboardExtensions
}

export type UseSearchPickerResultsOpenTabNavResult = {
  mergedExtensions: PlainPickerKeyboardExtensions
  previewNotice: string | null
}

/** EN: Results list — Ctrl+↑↓ jumps among rows with an open tab only. */
export function useSearchPickerResultsOpenTabNav({
  enabled,
  entries,
  hi,
  lineCount,
  setHi,
  searchMode,
  commandMode,
  listScrollHintRef,
  baseExtensions
}: UseSearchPickerResultsOpenTabNavOptions): UseSearchPickerResultsOpenTabNavResult {
  const uiCopy = useUiCopy()
  const [openTabIndices, setOpenTabIndices] = useState<number[]>([])
  const [previewNotice, setPreviewNotice] = useState<string | null>(null)
  const noticeTimerRef = useRef<number | null>(null)
  const hiRef = useRef(hi)
  const openTabIndicesRef = useRef(openTabIndices)
  hiRef.current = hi
  openTabIndicesRef.current = openTabIndices

  const entriesOpenTabKey = useMemo(
    () => entries.map((e) => `${e.id}:${e.tabId ?? ""}:${e.url}`).join("\n"),
    [entries]
  )

  useEffect(() => {
    if (!enabled) {
      setOpenTabIndices([])
      return
    }
    let cancelled = false
    void listSearchPickerPreviewTargetIndices(entries).then((indices) => {
      if (!cancelled) {
        setOpenTabIndices(indices)
      }
    })
    return () => {
      cancelled = true
    }
  }, [entries, entriesOpenTabKey, enabled])

  const showNoOpenTabNotice = useCallback(() => {
    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current)
    }
    setPreviewNotice(uiCopy.t("search.picker.noPreviewTarget"))
    noticeTimerRef.current = window.setTimeout(() => {
      setPreviewNotice(null)
      noticeTimerRef.current = null
    }, 3200)
  }, [uiCopy])

  const customVerticalNav = useCallback(
    (e: KeyboardEvent): boolean => {
      if (!enabled || searchMode || commandMode) {
        return false
      }
      if (isPickerCtrlBlockedChord(e)) {
        return false
      }
      if (
        !isPickerCtrlOnlyChord(e) ||
        (!isPhysicalArrowUp(e) && !isPhysicalArrowDown(e))
      ) {
        return false
      }
      const ev = e as KeyboardEvent & { isComposing?: boolean }
      if (ev.isComposing || lineCount === 0) {
        return false
      }
      const navDir = verticalNavDirection(e)
      if (navDir === null) {
        return false
      }
      pickerStopEvent(e)
      const currentHi = hiRef.current
      const nextHi = adjacentSearchPickerPreviewHi(
        currentHi,
        navDir,
        openTabIndicesRef.current
      )
      if (nextHi === null) {
        showNoOpenTabNotice()
        return true
      }
      if (searchPickerPreviewScrollAnimated(currentHi, nextHi)) {
        listScrollHintRef.current = { animated: true, alignStart: true }
      }
      hiRef.current = nextHi
      setHi(nextHi)
      return true
    },
    [commandMode, enabled, lineCount, listScrollHintRef, searchMode, setHi, showNoOpenTabNotice]
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

  return { mergedExtensions, previewNotice }
}
