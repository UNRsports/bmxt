import {
  useCallback,
  useEffect,
  useLayoutEffect,
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
import { isPickerAltBlockedChord, isPickerAltOnlyChord } from "../side-picker/preview/picker-alt-chord"
import {
  isPickerCtrlBlockedChord,
  isPickerCtrlOnlyChord
} from "../side-picker/preview/picker-ctrl-chord"
import { usePickerAltKeyTracking } from "../side-picker/preview/use-picker-alt-key-tracking"
import { usePickerAltPreviewSync } from "../side-picker/preview/use-picker-alt-preview-sync"
import type { PickerEntry } from "../side-picker/model/picker-entry"
import { resolveSearchHighlightAppearance } from "../setting/appearance"
import { tSearch } from "../setting/i18n/ns/search"
import { useUiSettings } from "../setting/use-ui-settings"
import {
  adjacentSearchPickerPreviewHi,
  canPreviewSearchPickerSelection,
  searchPickerPreviewScrollAnimated
} from "./search-picker-preview-nav"
import { listSearchPickerPreviewTargetIndices } from "./search-picker-preview-targets"
import type { SearchPageActiveMode } from "./page-active-setting"
import {
  previewSearchPickerResultsMatchInBackground,
  type SearchPageHighlightColors
} from "./preview-search-picker-entry"
import type { SearchPickerListScrollHint } from "./use-search-picker-alt-preview-kit"

const PREVIEW_NOTICE_MS = 3200

export type UseSearchPickerResultsOpenTabNavOptions = {
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
  pageActiveMode?: SearchPageActiveMode
  listScrollHintRef: MutableRefObject<SearchPickerListScrollHint | null>
  baseExtensions?: PlainPickerKeyboardExtensions
}

export type UseSearchPickerResultsOpenTabNavResult = {
  mergedExtensions: PlainPickerKeyboardExtensions
  previewNotice: string | null
}

/** EN: Results list — page-active preview; Ctrl+↑↓ jumps among open-tab rows. */
export function useSearchPickerResultsOpenTabNav({
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
  pageActiveMode = "auto",
  listScrollHintRef,
  baseExtensions
}: UseSearchPickerResultsOpenTabNavOptions): UseSearchPickerResultsOpenTabNavResult {
  const { settings: uiSettings } = useUiSettings()
  const locale = uiSettings.locale
  const { settings } = useUiSettings()
  const altKeyHeldRef = useRef(false)
  const [altPreviewTick, setAltPreviewTick] = useState(0)
  const [openTabIndices, setOpenTabIndices] = useState<number[]>([])
  const [previewNotice, setPreviewNotice] = useState<string | null>(null)
  const noticeTimerRef = useRef<number | null>(null)
  const hiRef = useRef(hi)
  const matchHiRef = useRef(matchHi)
  const openTabIndicesRef = useRef(openTabIndices)
  const entriesRef = useRef(entries)
  const patternRef = useRef(pattern)
  const highlightColorsRef = useRef<SearchPageHighlightColors>(
    resolveSearchHighlightAppearance(settings.appearance)
  )
  hiRef.current = hi
  matchHiRef.current = matchHi
  openTabIndicesRef.current = openTabIndices
  entriesRef.current = entries
  patternRef.current = pattern
  highlightColorsRef.current = resolveSearchHighlightAppearance(settings.appearance)

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
    setPreviewNotice(tSearch("search.picker.noPreviewTarget", locale))
    noticeTimerRef.current = window.setTimeout(() => {
      setPreviewNotice(null)
      noticeTimerRef.current = null
    }, PREVIEW_NOTICE_MS)
  }, [locale])

  const runPreview = useCallback(async () => {
    const index = hiRef.current
    const entry = entriesRef.current[index]
    if (!entry) {
      return
    }
    await previewSearchPickerResultsMatchInBackground(
      entry,
      matchHiRef.current,
      patternRef.current,
      highlightColorsRef.current
    )
  }, [])

  const onAltKeyDown = useCallback(() => {
    const currentHi = hiRef.current
    const entry = entriesRef.current[currentHi]
    const canPreview = canPreviewSearchPickerSelection(
      "results",
      currentHi,
      openTabIndicesRef.current,
      [],
      entry?.pageMatches
    )
    if (!canPreview) {
      showNoOpenTabNotice()
      return
    }
    void runPreview()
  }, [runPreview, showNoOpenTabNotice])

  usePickerAltKeyTracking({
    enabled,
    altKeyHeldRef,
    bumpPreviewTickOnAltDown: pageActiveMode === "manual",
    setAltPreviewTick,
    onAltKeyDown
  })

  const entry = entries[hi]
  const previewKey =
    enabled && entry
      ? `results:${hi}:${matchHi}:${entry.id}:${pattern}:${highlightColorsRef.current.hitBg}:${highlightColorsRef.current.jumpBg}`
      : ""

  usePickerAltPreviewSync({
    enabled: enabled && lineCount > 0,
    isHostPaneFocused,
    mode: pageActiveMode,
    altKeyHeldRef,
    altPreviewTick,
    previewKey,
    isBlocked: () => {
      const currentHi = hiRef.current
      const row = entriesRef.current[currentHi]
      return !canPreviewSearchPickerSelection(
        "results",
        currentHi,
        openTabIndicesRef.current,
        [],
        row?.pageMatches
      )
    },
    runPreview
  })

  const customVerticalNav = useCallback(
    (e: KeyboardEvent): boolean => {
      if (!enabled || commandMode) {
        return false
      }
      const altArrow =
        isPickerAltOnlyChord(e) && (isPhysicalArrowUp(e) || isPhysicalArrowDown(e))
      if (searchMode && !altArrow) {
        return false
      }
      if (isPickerCtrlBlockedChord(e) || isPickerAltBlockedChord(e)) {
        return false
      }
      const ev = e as KeyboardEvent & { isComposing?: boolean }
      if (ev.isComposing || lineCount === 0) {
        return false
      }

      const ctrlArrow =
        isPickerCtrlOnlyChord(e) && (isPhysicalArrowUp(e) || isPhysicalArrowDown(e))
      const navDir = verticalNavDirection(e)

      if (ctrlArrow) {
        const ctrlDir = isPhysicalArrowDown(e) ? "down" : "up"
        pickerStopEvent(e)
        const currentHi = hiRef.current
        const nextHi = adjacentSearchPickerPreviewHi(
          currentHi,
          ctrlDir,
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
        if (pageActiveMode === "auto") {
          void runPreview()
        }
        return true
      }

      if (!altArrow || navDir === null) {
        return false
      }

      pickerStopEvent(e)
      altKeyHeldRef.current = true
      const currentHi = hiRef.current
      const nextHi =
        navDir === "down"
          ? Math.min(currentHi + 1, lineCount - 1)
          : Math.max(currentHi - 1, 0)
      hiRef.current = nextHi
      setHi(nextHi)
      const row = entriesRef.current[nextHi]
      const canPreview = canPreviewSearchPickerSelection(
        "results",
        nextHi,
        openTabIndicesRef.current,
        [],
        row?.pageMatches
      )
      if (!canPreview) {
        showNoOpenTabNotice()
      } else {
        void runPreview()
      }
      return true
    },
    [
      commandMode,
      enabled,
      lineCount,
      listScrollHintRef,
      pageActiveMode,
      runPreview,
      searchMode,
      setHi,
      showNoOpenTabNotice
    ]
  )

  useLayoutEffect(() => {
    if (!enabled || lineCount === 0 || pageActiveMode !== "auto" || !isHostPaneFocused) {
      return
    }
    void runPreview()
  }, [enabled, entriesOpenTabKey, isHostPaneFocused, lineCount, pageActiveMode, runPreview])

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
