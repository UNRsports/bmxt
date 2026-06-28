import type { SessionPatch } from "../../terminal-sessions/session-patches"
import type { ExternalSettingsRecoveryAnswerResult } from "../../../setting/external-settings-startup"
import type { JobRunner } from "../../../job"
import type { SessionListRow } from "../../../session"
import type { UiSettings } from "../../../setting/settings"
import type { UiLocale } from "../../../setting/locale"
import type { TranslationPairId } from "../../../translate/translation-pair"

export type CommandDispatchDeps = {
  sessionId: string
  sessionOrderLength: number
  applyRunCmdPatches: (patches: readonly SessionPatch[]) => void
  mode: "normal" | "isearch"
  iSearchMatches: string[]
  iSearchCycle: number
  iSearchSnapshot: string
  sessionListRows: SessionListRow[]
  uiSettings: UiSettings
  navArmedRef: React.MutableRefObject<boolean>
  navActiveRef: React.MutableRefObject<boolean>
  navPositionsRef: React.MutableRefObject<any>
  jobRunner: JobRunner
  tabPickerRef: React.MutableRefObject<any>
  searchListPickerRef: React.MutableRefObject<any>
  domListPickerRef: React.MutableRefObject<any>
  settingListPickerRef: React.MutableRefObject<any>
  tabsPageActiveModeRef: React.MutableRefObject<any>
  domPageActiveModeRef: React.MutableRefObject<any>
  translatePairIdRef: React.MutableRefObject<any>
  promptLine: () => string
  allowEmptyFirstPickerSyncRef: React.MutableRefObject<boolean>
  imeTokenPickerDismissedRef: React.MutableRefObject<boolean>
  tabPressSeqRef: React.MutableRefObject<number>
  lineRef: React.MutableRefObject<string>
  sessionListPickerDismissedRef: React.MutableRefObject<boolean>
  sessionNameTypingRef: React.MutableRefObject<boolean>
  sessionListPickerHiRef: React.MutableRefObject<number | null>
  setTabsPageActiveMode: (mode: any) => void
  setDomPageActiveMode: (mode: any) => void
  switchSessionFromListPicker: (commandLine: string, pickHi: number) => void
  setMode: (mode: "normal" | "isearch") => void
  setLine: (line: string) => void
  setCursorPos: (pos: number) => void
  setISearchCycle: (cycle: number) => void
  setHistNavIndex: (index: number) => void
  focusPrompt: () => void
  appendCommandToHistory: (cmd: string) => void
  appendLogLines: (lines: string[]) => void | Promise<void>
  setModeToolbarOrder: React.Dispatch<React.SetStateAction<any>>
  setNavArmed: (armed: boolean) => void
  setNavActive: (active: boolean) => void
  setTranslateEnabled: (enabled: boolean) => void
  setTranslatePairId: (id: TranslationPairId) => void
  resetNavTranslateSession: () => void
  activatePaneFocus: (pane: any) => void
  teardownNav: () => Promise<void>
  clearSearchLoadingProgress: () => void
  closeSettingPickerColumn: () => void
  setTabPicker: (sessionId: string, state: any) => void
  setSearchListPicker: (sessionId: string, state: any) => void
  setDomListPicker: (sessionId: string, state: any) => void
  setSettingListPicker: (sessionId: string, state: any) => void
  setSubCmdPicker: (state: any) => void
  runDomListAndShow: (domListLine: string, trimmed: string, announce: boolean) => Promise<void>
  runSearchListSearch: (trimmed: string, searchListLine: any) => Promise<void>
  runSnapshotSave: (trimmed: string, tabId?: string) => Promise<void>
  syncImeTokenPicker: (line: string, pos: number) => void
  openSessionNameTyping: (trimmed: string) => void
  saveSessionDisplayName: (name: string, lines: string[]) => void
  onSetSessionDisplayName: (sessionId: string, name: string) => void | Promise<void>
  onActivateSession: (sessionId: string) => void | Promise<void>
  externalSettingsRecoveryPendingRef: React.MutableRefObject<boolean>
  submitExternalSettingsRecoveryAnswer?: (
    trimmed: string
  ) => Promise<ExternalSettingsRecoveryAnswerResult>
}

export type CommandDispatchContext = {
  deps: CommandDispatchDeps
  trimmed: string
  rawLine: string
  locale: UiLocale
}

export type CommandDispatchResult = "handled" | "not_handled"

export function recordCommandHistory(deps: CommandDispatchDeps): void {
  deps.setHistNavIndex(-1)
  deps.tabPressSeqRef.current = 0
}

export function clearPrompt(deps: CommandDispatchDeps): void {
  deps.setLine("")
  deps.setCursorPos(0)
}

export function setContinuationPrompt(deps: CommandDispatchDeps, continuation: string): void {
  deps.setLine(continuation)
  deps.setCursorPos(continuation.length)
  deps.lineRef.current = continuation
  deps.focusPrompt()
}
