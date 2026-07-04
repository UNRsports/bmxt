import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import type { SearchListPickerState } from "../../search/search-list-picker-input"
import type { DomListPickerState } from "../../dom/dom-list-picker-input"
import type { SettingListPickerState } from "../../setting/setting-list-picker-state"
import {
  saveTabsPageActiveMode,
  type TabsPageActiveMode
} from "../../tabs/page-active-setting"
import {
  saveSearchPageActiveMode,
  type SearchPageActiveMode
} from "../../search/page-active-setting"
import {
  saveDomPageActiveMode,
  type DomPageActiveMode
} from "../../dom/page-active-setting"
import { saveTranslatePair, type TranslationPairId } from "../../translate"
import { TRANSLATION_PAIR_IDS } from "../../translate/translation-pair"
import type { TabPickerState } from "../../side-picker/session/tab-picker-state"
import type { PaneFocusTarget } from "../../side-picker/panel/pane-focus-nav"
import {
  detailBarToPickerSlot,
  isPickerDetailBar,
  listVisibleDetailBars,
  pickerSlotToDetailBar,
  resolvePickerColumnOrder,
  type DetailBarId
} from "../detail-bar-focus"
import { useDetailBarKeyboard } from "../use-detail-bar-keyboard"
import type { TokenPickerModel } from "../token-picker-panel"
import { openPickerSlots, type PickerSlotId, type SessionPickerState } from "../../side-picker/session/session-pickers"
import { activateModeToolbar, deactivateModeToolbar, type ModeToolbarId } from "../mode-toolbar-order"

export type UsePaneFocusControllerOptions = {
  sessionId: string
  isFocusedPane: boolean
  paneFocus: PaneFocusTarget
  onPaneFocusChange: (target: PaneFocusTarget) => void
  detailBarId: DetailBarId | null
  setDetailBarId: React.Dispatch<React.SetStateAction<DetailBarId | null>>
  modeToolbarOrder: ModeToolbarId[]
  setModeToolbarOrder: React.Dispatch<React.SetStateAction<ModeToolbarId[]>>
  sessionPickers: SessionPickerState
  navArmed: boolean
  navActive: boolean
  navArmedRef: React.MutableRefObject<boolean>
  navActiveRef: React.MutableRefObject<boolean>
  navPageTyping: boolean
  navTypingMode: boolean
  navMenuOpen: boolean
  navTextSelPicking: boolean
  navTextSelDone: boolean
  sessionNameTyping: boolean
  mode: "normal" | "isearch"
  subCmdPicker: TokenPickerModel | null
  sessionListPickerOpen: boolean
  tabPicker: TabPickerState | null
  searchListPicker: SearchListPickerState | null
  domListPicker: DomListPickerState | null
  settingListPicker: SettingListPickerState | null
  translateEnabled: boolean
  translatePairIdRef: React.MutableRefObject<TranslationPairId>
  tabsPageActiveModeRef: React.MutableRefObject<TabsPageActiveMode>
  searchPageActiveModeRef: React.MutableRefObject<SearchPageActiveMode>
  domPageActiveModeRef: React.MutableRefObject<DomPageActiveMode>
  setTabsPageActiveMode: (mode: TabsPageActiveMode) => void
  setSearchPageActiveMode: (mode: SearchPageActiveMode) => void
  setDomPageActiveMode: (mode: DomPageActiveMode) => void
  setTranslatePairId: (id: TranslationPairId) => void
  toggleNavActive: () => void
  resetNavTranslateSession: () => void
  lineRef: React.MutableRefObject<string>
  cursorRef: React.MutableRefObject<number>
  setCursorPos: (pos: number) => void
  imeRef: React.RefObject<HTMLTextAreaElement | null>
  tabPickerInputRef: React.RefObject<HTMLTextAreaElement | null>
  searchPickerInputRef: React.RefObject<HTMLTextAreaElement | null>
  domPickerInputRef: React.RefObject<HTMLTextAreaElement | null>
  settingPickerInputRef: React.RefObject<HTMLTextAreaElement | null>
  pickersForColumnOrder: readonly PickerSlotId[]
  openPickers: readonly PickerSlotId[]
  focusPrompt: () => void
  closePromptPickerUi: () => void
  setSettingListPicker: (
    forSessionId: string,
    value: SettingListPickerState | null | ((prev: SettingListPickerState | null) => SettingListPickerState | null)
  ) => void
}

/** EN: Picker / detail-bar focus, column order, and layout side-effects. */
export function usePaneFocusController(options: UsePaneFocusControllerOptions) {
  const pickerColumnOrderRef = useRef<readonly PickerSlotId[]>([])
  const skipNextPromptFocusRef = useRef(false)
  const prevOpenPickersRef = useRef<readonly PickerSlotId[] | null>(null)
  const [pickerPulseSlot, setPickerPulseSlot] = useState<PickerSlotId | null>(null)
  const pickerPulseTimerRef = useRef<number | null>(null)

  const promptPaneFocused = options.isFocusedPane && options.paneFocus === "terminal"

  const pickerInputRefForSlot = useCallback((slot: PickerSlotId) => {
    switch (slot) {
      case "tabs":
        return options.tabPickerInputRef
      case "search":
        return options.searchPickerInputRef
      case "dom":
        return options.domPickerInputRef
      case "setting":
        return options.settingPickerInputRef
    }
  }, [
    options.tabPickerInputRef,
    options.searchPickerInputRef,
    options.domPickerInputRef,
    options.settingPickerInputRef
  ])

  const pulsePickerColumn = useCallback((slot: PickerSlotId) => {
    setPickerPulseSlot(slot)
    if (pickerPulseTimerRef.current !== null) {
      window.clearTimeout(pickerPulseTimerRef.current)
    }
    pickerPulseTimerRef.current = window.setTimeout(() => {
      setPickerPulseSlot(null)
      pickerPulseTimerRef.current = null
    }, 360)
  }, [])

  const focusPickerSlot = useCallback(
    (slot: PickerSlotId) => {
      skipNextPromptFocusRef.current = true
      options.onPaneFocusChange(slot)
      requestAnimationFrame(() => {
        const input = pickerInputRefForSlot(slot).current
        if (input) {
          input.focus({ preventScroll: true })
          return
        }
        requestAnimationFrame(() => {
          pickerInputRefForSlot(slot).current?.focus({ preventScroll: true })
        })
      })
    },
    [options.onPaneFocusChange, pickerInputRefForSlot]
  )

  const activatePaneFocus = useCallback(
    (target: PaneFocusTarget) => {
      if (target === "terminal") {
        options.onPaneFocusChange(target)
        options.focusPrompt()
      } else if (target === "detailBar") {
        options.onPaneFocusChange(target)
        options.imeRef.current?.blur()
      } else {
        focusPickerSlot(target)
      }
    },
    [focusPickerSlot, options]
  )

  const activateDetailBar = useCallback(
    (id: DetailBarId) => {
      options.closePromptPickerUi()
      options.setDetailBarId(id)
      options.onPaneFocusChange("detailBar")
      options.imeRef.current?.blur()
      if (isPickerDetailBar(id)) {
        pulsePickerColumn(detailBarToPickerSlot(id))
      }
    },
    [options, pulsePickerColumn]
  )

  const enterPickerFromDetailBar = useCallback(() => {
    if (options.detailBarId === null || !isPickerDetailBar(options.detailBarId)) {
      return
    }
    focusPickerSlot(detailBarToPickerSlot(options.detailBarId))
  }, [options.detailBarId, focusPickerSlot])

  const exitPickerToDetailBar = useCallback(
    (slot: PickerSlotId) => {
      activateDetailBar(pickerSlotToDetailBar(slot))
    },
    [activateDetailBar]
  )

  const exitDetailBarToTerminal = useCallback(() => {
    options.onPaneFocusChange("terminal")
    const end = options.lineRef.current.length
    options.setCursorPos(end)
    options.focusPrompt()
  }, [options.onPaneFocusChange, options.lineRef, options.setCursorPos, options.focusPrompt])

  const closeSettingPickerColumn = useCallback(() => {
    options.setSettingListPicker(options.sessionId, null)
    options.setModeToolbarOrder((prev) => deactivateModeToolbar(prev, "setting"))
    activatePaneFocus("terminal")
  }, [activatePaneFocus, options])

  const focusTerminalForNavControl = useCallback(() => {
    exitDetailBarToTerminal()
  }, [exitDetailBarToTerminal])

  const focusNavDetailBar = useCallback(() => {
    if (!options.navArmedRef.current) {
      return
    }
    activateDetailBar("nav")
  }, [activateDetailBar, options.navArmedRef])

  const handleToggleNavActive = useCallback(() => {
    const turningOn = !options.navActiveRef.current
    options.toggleNavActive()
    if (turningOn) {
      focusTerminalForNavControl()
    } else {
      focusNavDetailBar()
    }
  }, [focusNavDetailBar, focusTerminalForNavControl, options])

  const toggleTabsPageActiveFromDetailBar = useCallback(() => {
    const next: TabsPageActiveMode =
      options.tabsPageActiveModeRef.current === "auto" ? "manual" : "auto"
    void saveTabsPageActiveMode(next).then(() => {
      options.setTabsPageActiveMode(next)
      options.tabsPageActiveModeRef.current = next
    })
  }, [options])

  const toggleSearchPageActiveFromDetailBar = useCallback(() => {
    const next: SearchPageActiveMode =
      options.searchPageActiveModeRef.current === "auto" ? "manual" : "auto"
    void saveSearchPageActiveMode(next).then(() => {
      options.setSearchPageActiveMode(next)
      options.searchPageActiveModeRef.current = next
    })
  }, [options])

  const toggleDomPageActiveFromDetailBar = useCallback(() => {
    const next: DomPageActiveMode =
      options.domPageActiveModeRef.current === "auto" ? "manual" : "auto"
    void saveDomPageActiveMode(next).then(() => {
      options.setDomPageActiveMode(next)
      options.domPageActiveModeRef.current = next
    })
  }, [options])

  const cycleTranslatePairFromDetailBar = useCallback(
    (direction: 1 | -1) => {
      const index = TRANSLATION_PAIR_IDS.indexOf(options.translatePairIdRef.current)
      const next =
        TRANSLATION_PAIR_IDS[
          (index + direction + TRANSLATION_PAIR_IDS.length) % TRANSLATION_PAIR_IDS.length
        ]!
      void (async () => {
        await saveTranslatePair(next)
        options.setTranslatePairId(next)
        options.resetNavTranslateSession()
      })()
    },
    [options]
  )

  const isDetailBarVisible = useCallback(
    (id: DetailBarId): boolean => {
      if (id === "nav") {
        return options.navArmed
      }
      if (id === "translate") {
        return options.translateEnabled
      }
      if (id === "tabs") {
        return options.tabPicker !== null
      }
      if (id === "search") {
        return options.searchListPicker !== null
      }
      if (id === "dom") {
        return options.domListPicker !== null
      }
      return options.settingListPicker !== null
    },
    [
      options.domListPicker,
      options.navArmed,
      options.searchListPicker,
      options.settingListPicker,
      options.tabPicker,
      options.translateEnabled
    ]
  )

  const visibleDetailBars = useMemo(
    () => listVisibleDetailBars(options.modeToolbarOrder, isDetailBarVisible),
    [isDetailBarVisible, options.modeToolbarOrder]
  )

  const pickerColumnOrder = useMemo(() => {
    const focusedPickerSlot =
      options.paneFocus !== "terminal" && options.paneFocus !== "detailBar"
        ? options.paneFocus
        : null
    const highlightSlot =
      options.paneFocus === "detailBar" &&
      options.detailBarId !== null &&
      isPickerDetailBar(options.detailBarId)
        ? detailBarToPickerSlot(options.detailBarId)
        : focusedPickerSlot
    const order = resolvePickerColumnOrder(
      options.pickersForColumnOrder,
      highlightSlot,
      pickerColumnOrderRef.current
    )
    pickerColumnOrderRef.current = order
    return order
  }, [options.detailBarId, options.paneFocus, options.pickersForColumnOrder])

  useDetailBarKeyboard({
    enabled: visibleDetailBars.length > 0 || options.navArmed,
    isFocusedPane: options.isFocusedPane,
    paneFocus: options.paneFocus,
    visibleDetailBars,
    detailBarId: options.detailBarId,
    navArmed: options.navArmed,
    navActive: options.navActive,
    navTypingMode: options.navTypingMode,
    blocked:
      options.navPageTyping ||
      options.sessionNameTyping ||
      options.mode === "isearch" ||
      options.subCmdPicker !== null ||
      options.sessionListPickerOpen,
    isCaretAtPromptEnd: () => options.cursorRef.current >= options.lineRef.current.length,
    actions: {
      activateDetailBar,
      enterPickerFromDetailBar,
      exitDetailBarToTerminal,
      toggleNavActive: handleToggleNavActive,
      cycleTranslatePair: cycleTranslatePairFromDetailBar,
      toggleTabsPageActive: toggleTabsPageActiveFromDetailBar,
      toggleSearchPageActive: toggleSearchPageActiveFromDetailBar,
      toggleDomPageActive: toggleDomPageActiveFromDetailBar
    }
  })

  useLayoutEffect(() => {
    const prev = prevOpenPickersRef.current
    if (prev === null) {
      prevOpenPickersRef.current = options.openPickers
      return
    }
    const newlyOpened = options.openPickers.filter((slot) => !prev.includes(slot))
    prevOpenPickersRef.current = options.openPickers
    if (!options.isFocusedPane || newlyOpened.length === 0) {
      return
    }
    focusPickerSlot(newlyOpened[newlyOpened.length - 1]!)
  }, [focusPickerSlot, options.isFocusedPane, options.openPickers])

  const prevNavActiveRef = useRef(options.navActive)
  useLayoutEffect(() => {
    const wasActive = prevNavActiveRef.current
    prevNavActiveRef.current = options.navActive
    if (wasActive && !options.navActive && options.navArmed) {
      focusNavDetailBar()
      return
    }
    if (options.navActive && options.paneFocus !== "terminal") {
      focusTerminalForNavControl()
    }
  }, [
    focusNavDetailBar,
    focusTerminalForNavControl,
    options.navActive,
    options.navArmed,
    options.paneFocus
  ])

  useLayoutEffect(() => {
    if (promptPaneFocused) {
      if (skipNextPromptFocusRef.current) {
        skipNextPromptFocusRef.current = false
        return
      }
      options.focusPrompt()
      return
    }
    options.closePromptPickerUi()
    options.imeRef.current?.blur()
  }, [options.closePromptPickerUi, promptPaneFocused, options.focusPrompt, options.imeRef])

  useEffect(() => {
    if (!promptPaneFocused) {
      return
    }
    const onWinFocus = () => options.focusPrompt()
    window.addEventListener("focus", onWinFocus)
    return () => window.removeEventListener("focus", onWinFocus)
  }, [promptPaneFocused, options.focusPrompt])

  return {
    promptPaneFocused,
    pickerPulseSlot,
    pickerColumnOrder,
    activatePaneFocus,
    activateDetailBar,
    enterPickerFromDetailBar,
    exitPickerToDetailBar,
    exitDetailBarToTerminal,
    closeSettingPickerColumn,
    focusPickerSlot,
    handleToggleNavActive
  }
}
