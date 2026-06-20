import type { RefObject } from "react"
import type { PaneFocusTarget } from "../../side-picker/panel/pane-focus-nav"
import type { TabPickerState } from "../../side-picker/session/tab-picker-state"
import type { SearchListPickerState } from "../../search/search-list-picker-input"
import type { DomListPickerState } from "../../dom/dom-list-picker-input"
import type { SettingListPickerState } from "../../setting"
import type { SessionListRow } from "../../session"
import type { NavPositionsByTab } from "../../nav"
import type { TabsPageActiveMode } from "../../tabs"
import type { TranslationPairId } from "../../translate"
import type { UiSettings } from "../../setting/settings"
import type { useUiCopy } from "../../setting"
import type { ModeToolbarId } from "../mode-toolbar-order"
import type { SetStateAction } from "react"
import type { PickerSlotId } from "../../side-picker"
import type { SessionPickerState } from "../../side-picker"

export type PromptBlockedFlags = {
  sessionNameTyping: boolean
  mode: "normal" | "isearch"
  subCmdPickerOpen: boolean
  sessionListPickerOpen: boolean
}

export type NavTranslateMeta = {
  busy: boolean
  statusNote: string | null
}

export type PromptShellBridge = {
  sessionId: string
  sessionListRows: SessionListRow[]
  currentSessionDisplayName: string
  uiCopy: ReturnType<typeof useUiCopy>
  uiSettings: UiSettings
  paneFocusRef: RefObject<PaneFocusTarget>
  navPositionsRef: RefObject<NavPositionsByTab>
  tabsPageActiveModeRef: RefObject<TabsPageActiveMode>
  translatePairIdRef: RefObject<TranslationPairId>
  appendCommandToHistory: (cmd: string) => void
  appendLogLines: (newLines: string[]) => Promise<void>
  onActivateSession: (sessionId: string) => Promise<void>
  onSetSessionDisplayName: (sessionId: string, name: string) => Promise<void>
  activatePaneFocus: (target: PaneFocusTarget) => void
  closeSettingPickerColumn: () => void
  runDomListAndShow: (
    domListLine: string,
    displayLine: string,
    announce: boolean
  ) => Promise<void>
  runSearchListSearch: (displayLine: string, searchListLine: string) => Promise<void>
  cancelSearchPageScan: () => void
  cancelSearchListJob: () => void
  isSearchListJobActive: () => boolean
  isDomListJobActive: () => boolean
  cancelDomListJob: () => void
  getTabPicker: () => TabPickerState | null
  getSearchListPicker: () => SearchListPickerState | null
  getSettingListPicker: () => SettingListPickerState | null
  getDomListPicker: () => DomListPickerState | null
  getNavArmed: () => boolean
  getNavActive: () => boolean
  setTabPicker: (
    forSessionId: string,
    v: TabPickerState | null | ((prev: TabPickerState | null) => TabPickerState | null)
  ) => void
  setSearchListPicker: (
    forSessionId: string,
    v:
      | SearchListPickerState
      | null
      | ((prev: SearchListPickerState | null) => SearchListPickerState | null)
  ) => void
  setSettingListPicker: (
    forSessionId: string,
    v:
      | SettingListPickerState
      | null
      | ((prev: SettingListPickerState | null) => SettingListPickerState | null)
  ) => void
  setDomListPicker: (
    forSessionId: string,
    v: DomListPickerState | null | ((prev: DomListPickerState | null) => DomListPickerState | null)
  ) => void
  setModeToolbarOrder: (update: SetStateAction<ModeToolbarId[]>) => void
  setNavArmed: (armed: boolean) => void
  setNavActive: (active: boolean) => void
  teardownNav: () => Promise<void>
  clearSearchLoadingProgress: () => void
  clearNavPositions: () => void
  setTabsPageActiveMode: (mode: TabsPageActiveMode) => void
  setTranslateEnabled: (enabled: boolean) => void
  setTranslatePairId: (id: TranslationPairId) => void
  onPromptBlockedChange: (flags: PromptBlockedFlags) => void
  onNavTranslateMetaChange: (meta: NavTranslateMeta) => void
}
