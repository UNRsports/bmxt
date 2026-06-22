import { useCallback } from "react"
import { continuationPromptAfterLoneFirstToken } from "../../builtin-commands/command-subcommands.gen"
import { canScriptHttpHostPages } from "../../extension-permissions/optional-http-hosts"
import { isJobHandleActive, type JobRunner } from "../../job"
import {
  parseDomExitListLine,
  parseDomListPickerLine,
} from "../../dom/dom-list-picker-input"
import {
  parseNavEnterLine,
  parseNavExitLine,
} from "../../nav"
import {
  isSearchListContinuationPrompt,
  isSearchListReadyToRun,
  parseSearchExitListLine,
  parseSearchListPickerLine,
} from "../../search/search-list-picker-input"
import {
  parseSessionListPickerLine,
  parseSessionSettingNameBareLine,
  parseSessionSettingNameWithLine,
  parseSessionSwitchByNumberLine,
  parseSessionSwitchPickerLine,
  parseSessionSwitchWithLine,
  resolveSessionRowByDisplayName,
  type SessionListRow
} from "../../session"
import {
  parseSettingExitListLine,
  parseSettingIncompleteLine,
  parseSettingListPickerLine,
} from "../../setting/setting-list-picker-input"
import { createSettingListPickerState } from "../../setting/setting-list-picker-state"
import { buildTabPickerRows, resolveInitialTabPickerHighlightIndex } from "../../tabs/picker-rows"
import {
  parseGroupNewInteractiveLine,
  parseTabsExitListLine,
  parseTabsListPickerLine
} from "../../tabs/input"
import { parseTabsSettingCommandLine } from "../../tabs/parse-tabs-setting-command"
import {
  saveTabsPageActiveMode,
  settingTokenForPageActiveMode,
  TABS_PAGE_ACTIVE_MODE_TOKENS,
  type TabsPageActiveMode
} from "../../tabs/page-active-setting"
import {
  closeTabPickerEngineForSession,
  openTabPickerEngineForSession
} from "../../tabs/engine"
import {
  listTranslationPairSettingTokens,
  parseTranslateCommandLine,
  saveTranslateEnabled,
  saveTranslatePair,
  settingTokenForPairId,
} from "../../translate"
import { translateOnLogLine } from "../../setting/i18n/resolvers"
import { buildHelpLines } from "../../bmxt-core/registry/help"
import { activateModeToolbar, deactivateModeToolbar } from "../mode-toolbar-order"
import type { UiCopy } from "../../setting/use-ui-copy"
import type { UiSettings } from "../../setting/settings"
import type { TranslationPairId } from "../../translate/translation-pair"

export type CommandDispatchDeps = {
  sessionId: string
  mode: "normal" | "isearch"
  iSearchMatches: string[]
  iSearchCycle: number
  iSearchSnapshot: string
  sessionListRows: SessionListRow[]
  uiCopy: UiCopy
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
  translatePairIdRef: React.MutableRefObject<any>
  promptLine: () => string
  allowEmptyFirstPickerSyncRef: React.MutableRefObject<boolean>
  imeTokenPickerDismissedRef: React.MutableRefObject<boolean>
  tabPressSeqRef: React.MutableRefObject<number>
  lineRef: React.MutableRefObject<string>
  sessionListPickerDismissedRef: React.MutableRefObject<boolean>
  sessionNameTypingRef: React.MutableRefObject<boolean>
  sessionListPickerHiRef: React.MutableRefObject<number | null>
  setTabsPageActiveMode: (mode: TabsPageActiveMode) => void
  switchSessionFromListPicker: (commandLine: string, pickHi: number) => void
  setMode: (mode: "normal" | "isearch") => void
  setLine: (line: string) => void
  setCursorPos: (pos: number) => void
  setISearchCycle: (cycle: number) => void
  setHistNavIndex: (index: number) => void
  focusPrompt: () => void
  appendCommandToHistory: (cmd: string) => void
  appendLogLines: (lines: string[]) => Promise<void>
  setModeToolbarOrder: React.Dispatch<React.SetStateAction<any>>
  setNavArmed: (armed: boolean) => void
  setNavActive: (active: boolean) => void
  setTranslateEnabled: (enabled: boolean) => void
  setTranslatePairId: (id: TranslationPairId) => void
  resetNavTranslateSession: () => void
  activatePaneFocus: (pane: string) => void
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
  syncImeTokenPicker: (line: string, pos: number) => void
  openSessionNameTyping: (trimmed: string) => void
  saveSessionDisplayName: (name: string, lines: string[]) => void
  onActivateSession: (sessionId: string) => Promise<void>
}

export function useCommandDispatch(deps: CommandDispatchDeps) {
  const submitLine = useCallback(() => {
    deps.allowEmptyFirstPickerSyncRef.current = false
    deps.imeTokenPickerDismissedRef.current = false
    if (deps.mode === "isearch") {
      const pick = deps.iSearchMatches[deps.iSearchCycle]
      const next = pick !== undefined ? pick : deps.iSearchSnapshot
      deps.setMode("normal")
      deps.setLine(next)
      deps.setCursorPos(next.length)
      deps.setISearchCycle(0)
      deps.setHistNavIndex(-1)
      deps.tabPressSeqRef.current = 0
      deps.focusPrompt()
      return
    }
    const rawLine = deps.promptLine()
    const trimmed = rawLine.trim()
    if (!trimmed) {
      return
    }

    if (parseSettingIncompleteLine(trimmed)) {
      deps.appendCommandToHistory(trimmed)
      deps.setHistNavIndex(-1)
      deps.tabPressSeqRef.current = 0
      const cont = "setting "
      deps.setLine(cont)
      deps.setCursorPos(cont.length)
      deps.lineRef.current = cont
      void deps.appendLogLines([`> ${trimmed}`, deps.uiCopy.t("setting.usage")])
      deps.focusPrompt()
      return
    }

    if (parseSettingListPickerLine(trimmed)) {
      deps.appendCommandToHistory(trimmed)
      deps.setLine("")
      deps.setCursorPos(0)
      deps.setHistNavIndex(-1)
      deps.tabPressSeqRef.current = 0
      void (async () => {
        try {
          const state = createSettingListPickerState(deps.uiSettings)
          await deps.appendLogLines([`> ${trimmed}`, deps.uiCopy.t("setting.picker.hint")])
          deps.setSettingListPicker(deps.sessionId, state)
          deps.setModeToolbarOrder((prev: any) => activateModeToolbar(prev, "setting"))
        } catch (e) {
          await deps.appendLogLines([
            `> ${trimmed}`,
            deps.uiCopy.t("error.generic", {
              message: e instanceof Error ? e.message : String(e)
            })
          ])
        }
      })()
      return
    }

    if (parseSettingExitListLine(trimmed)) {
      deps.appendCommandToHistory(trimmed)
      deps.setLine("")
      deps.setCursorPos(0)
      deps.setHistNavIndex(-1)
      deps.tabPressSeqRef.current = 0
      void (async () => {
        const logLines = [`> ${trimmed}`]
        if (deps.settingListPickerRef.current !== null) {
          deps.closeSettingPickerColumn()
          logLines.push(deps.uiCopy.t("setting.picker.closed"))
        } else {
          logLines.push(deps.uiCopy.t("setting.picker.notOpen"))
        }
        await deps.appendLogLines(logLines)
        deps.focusPrompt()
      })()
      return
    }

    if (parseTabsSettingCommandLine(trimmed) !== null) {
      const tabsSettingCmd = parseTabsSettingCommandLine(trimmed)
      if (tabsSettingCmd === null) {
        return
      }
      deps.appendCommandToHistory(trimmed)
      deps.setHistNavIndex(-1)
      deps.tabPressSeqRef.current = 0
      if (tabsSettingCmd.kind === "incomplete") {
        const cont = "tabs "
        deps.setLine(cont)
        deps.setCursorPos(cont.length)
        deps.lineRef.current = cont
        void deps.appendLogLines([
          `> ${trimmed}`,
          deps.uiCopy.t("tabs.usage"),
          deps.uiCopy.t("tabs.settingHint")
        ])
        deps.focusPrompt()
        return
      }
      if (tabsSettingCmd.kind === "setting-incomplete") {
        const cont = "tabs -setting "
        deps.setLine(cont)
        deps.setCursorPos(cont.length)
        deps.lineRef.current = cont
        void deps.appendLogLines([
          `> ${trimmed}`,
          deps.uiCopy.t("tabs.setting.choose"),
          deps.uiCopy.t("tabs.setting.pageActiveCurrent", {
            token: settingTokenForPageActiveMode(deps.tabsPageActiveModeRef.current)
          })
        ])
        deps.focusPrompt()
        return
      }
      if (tabsSettingCmd.kind === "page-active-incomplete") {
        const cont = "tabs -setting -page-active "
        deps.setLine(cont)
        deps.setCursorPos(cont.length)
        deps.lineRef.current = cont
        const options = TABS_PAGE_ACTIVE_MODE_TOKENS.join(" | ")
        void deps.appendLogLines([
          `> ${trimmed}`,
          deps.uiCopy.t("tabs.pageActive.choose", { options }),
          deps.uiCopy.t("setting.language.current", {
            token: settingTokenForPageActiveMode(deps.tabsPageActiveModeRef.current)
          })
        ])
        deps.focusPrompt()
        return
      }
      deps.setLine("")
      deps.setCursorPos(0)
      deps.lineRef.current = ""
      void (async () => {
        await saveTabsPageActiveMode(tabsSettingCmd.mode)
        deps.setTabsPageActiveMode(tabsSettingCmd.mode)
        deps.tabsPageActiveModeRef.current = tabsSettingCmd.mode
        const token = settingTokenForPageActiveMode(tabsSettingCmd.mode)
        await deps.appendLogLines([`> ${trimmed}`, deps.uiCopy.t("tabs.pageActive.set", { token })])
        deps.focusPrompt()
      })()
      return
    }

    if (deps.sessionNameTypingRef.current) {
      deps.appendCommandToHistory(trimmed)
      deps.saveSessionDisplayName(trimmed, [])
      return
    }

    if (parseSessionListPickerLine(trimmed)) {
      const activeIdx = deps.sessionListRows.findIndex((r) => r.isActive)
      const pickHi = deps.sessionListPickerHiRef.current ?? (activeIdx >= 0 ? activeIdx : 0)
      deps.switchSessionFromListPicker(trimmed, pickHi)
      return
    }

    if (parseSessionSettingNameBareLine(trimmed)) {
      deps.openSessionNameTyping(trimmed)
      return
    }

    const sessionSettingName = parseSessionSettingNameWithLine(trimmed)
    if (sessionSettingName !== null) {
      deps.appendCommandToHistory(trimmed)
      deps.saveSessionDisplayName(sessionSettingName, [`> ${trimmed}`])
      return
    }

    const sessionSwitchName = parseSessionSwitchWithLine(trimmed)
    if (sessionSwitchName !== null) {
      deps.appendCommandToHistory(trimmed)
      deps.setLine("")
      deps.setCursorPos(0)
      deps.setHistNavIndex(-1)
      deps.tabPressSeqRef.current = 0
      const row = resolveSessionRowByDisplayName(deps.sessionListRows, sessionSwitchName)
      void (async () => {
        const logLines = [`> ${trimmed}`]
        if (!row) {
          logLines.push(deps.uiCopy.t("session.switch.notFound", { name: sessionSwitchName }))
        } else {
          logLines.push(deps.uiCopy.t("session.switch.switched", { name: row.displayName }))
          await deps.onActivateSession(row.sessionId)
        }
        await deps.appendLogLines(logLines)
        deps.focusPrompt()
      })()
      return
    }

    if (parseSessionSwitchPickerLine(trimmed)) {
      deps.sessionListPickerDismissedRef.current = false
      deps.syncImeTokenPicker(deps.lineRef.current, deps.lineRef.current.length)
      deps.focusPrompt()
      return
    }

    const sessionNumber = parseSessionSwitchByNumberLine(trimmed)
    if (sessionNumber !== null) {
      deps.appendCommandToHistory(trimmed)
      deps.setLine("")
      deps.setCursorPos(0)
      deps.setHistNavIndex(-1)
      deps.tabPressSeqRef.current = 0
      const row = deps.sessionListRows[sessionNumber - 1]
      void (async () => {
        const logLines = [`> ${trimmed}`]
        if (!row) {
          logLines.push(
            deps.uiCopy.t("session.number.invalid", {
              n: String(sessionNumber),
              max: String(deps.sessionListRows.length)
            })
          )
          await deps.appendLogLines(logLines)
          deps.focusPrompt()
          return
        }
        logLines.push(deps.uiCopy.t("session.number.switched", { n: String(sessionNumber) }))
        await deps.appendLogLines(logLines)
        await deps.onActivateSession(row.sessionId)
        deps.focusPrompt()
      })()
      return
    }

    const listPicker = parseTabsListPickerLine(trimmed)
    if (listPicker) {
      const { showUrl } = listPicker
      deps.appendCommandToHistory(trimmed)
      deps.setLine("")
      deps.setCursorPos(0)
      deps.setHistNavIndex(-1)
      deps.tabPressSeqRef.current = 0
      void (async () => {
        try {
          const rows = await buildTabPickerRows(showUrl, deps.uiSettings.locale)
          const initialHi = await resolveInitialTabPickerHighlightIndex(rows)
          const pageActiveToken = settingTokenForPageActiveMode(deps.tabsPageActiveModeRef.current)
          await deps.appendLogLines([
            `> ${trimmed}`,
            deps.uiCopy.t("tabs.picker.hint", { token: pageActiveToken })
          ])
          deps.setTabPicker(deps.sessionId, openTabPickerEngineForSession(deps.sessionId, { rows, showUrl, initialHi }))
          deps.setModeToolbarOrder((prev: any) => activateModeToolbar(prev, "tabs"))
        } catch (e) {
          await deps.appendLogLines([
            `> ${trimmed}`,
            deps.uiCopy.t("error.generic", {
              message: e instanceof Error ? e.message : String(e)
            })
          ])
        }
      })()
      return
    }

    if (parseTabsExitListLine(trimmed)) {
      deps.appendCommandToHistory(trimmed)
      deps.setLine("")
      deps.setCursorPos(0)
      deps.setHistNavIndex(-1)
      deps.tabPressSeqRef.current = 0
      void (async () => {
        const logLines = [`> ${trimmed}`]
        if (deps.tabPickerRef.current !== null) {
          closeTabPickerEngineForSession(deps.sessionId)
          deps.setTabPicker(deps.sessionId, null)
          deps.setModeToolbarOrder((prev: any) => deactivateModeToolbar(prev, "tabs"))
          deps.activatePaneFocus("terminal")
          logLines.push(deps.uiCopy.t("tabs.picker.closed"))
        } else {
          logLines.push(deps.uiCopy.t("tabs.picker.notOpen"))
        }
        await deps.appendLogLines(logLines)
        deps.focusPrompt()
      })()
      return
    }

    if (parseSearchExitListLine(trimmed)) {
      deps.appendCommandToHistory(trimmed)
      deps.setLine("")
      deps.setCursorPos(0)
      deps.setHistNavIndex(-1)
      deps.tabPressSeqRef.current = 0
      void (async () => {
        const logLines = [`> ${trimmed}`]
        const hadActiveJob = deps.jobRunner.isActive("search-list")
        if (hadActiveJob) {
          deps.jobRunner.cancel("search-list")
        }
        deps.clearSearchLoadingProgress()
        if (deps.searchListPickerRef.current !== null) {
          deps.setSearchListPicker(deps.sessionId, null)
          deps.setModeToolbarOrder((prev: any) => deactivateModeToolbar(prev, "search"))
          deps.activatePaneFocus("terminal")
          logLines.push(deps.uiCopy.t("search.picker.closed"))
        } else if (hadActiveJob) {
          logLines.push(deps.uiCopy.t("search.picker.cancelled"))
        } else {
          logLines.push(deps.uiCopy.t("search.picker.notOpen"))
        }
        await deps.appendLogLines(logLines)
        deps.focusPrompt()
      })()
      return
    }

    if (parseNavEnterLine(trimmed)) {
      deps.appendCommandToHistory(trimmed)
      deps.setLine("")
      deps.setCursorPos(0)
      deps.setHistNavIndex(-1)
      deps.tabPressSeqRef.current = 0
      deps.setNavArmed(true)
      deps.setNavActive(false)
      deps.setModeToolbarOrder((prev: any) => activateModeToolbar(prev, "nav"))
      void (async () => {
        const canPage = await canScriptHttpHostPages()
        const logLines = [`> ${trimmed}`, deps.uiCopy.t("nav.armedLog")]
        if (!canPage) {
          logLines.push(deps.uiCopy.t("nav.hostAccessWarning"))
        }
        await deps.appendLogLines(logLines)
        deps.focusPrompt()
      })()
      return
    }

    const translateCmd = parseTranslateCommandLine(trimmed)
    if (translateCmd !== null) {
      deps.appendCommandToHistory(trimmed)
      deps.setHistNavIndex(-1)
      deps.tabPressSeqRef.current = 0
      if (translateCmd.kind === "incomplete") {
        const cont = "translate "
        deps.setLine(cont)
        deps.setCursorPos(cont.length)
        deps.lineRef.current = cont
        void deps.appendLogLines([
          `> ${trimmed}`,
          deps.uiCopy.t("translate.usage"),
          deps.uiCopy.t("translate.usageHint")
        ])
        deps.focusPrompt()
        return
      }
      if (translateCmd.kind === "setting-incomplete") {
        const cont = "translate -setting "
        deps.setLine(cont)
        deps.setCursorPos(cont.length)
        deps.lineRef.current = cont
        const options = listTranslationPairSettingTokens().join(" | ")
        void deps.appendLogLines([
          `> ${trimmed}`,
          deps.uiCopy.t("translate.setting.choose", { options }),
          deps.uiCopy.t("setting.language.current", {
            token: settingTokenForPairId(deps.translatePairIdRef.current)
          })
        ])
        deps.focusPrompt()
        return
      }
      deps.setLine("")
      deps.setCursorPos(0)
      deps.lineRef.current = ""
      void (async () => {
        if (translateCmd.kind === "on") {
          await saveTranslateEnabled(true)
          deps.setTranslateEnabled(true)
          deps.setModeToolbarOrder((prev: any) => activateModeToolbar(prev, "translate"))
          await deps.appendLogLines([
            `> ${trimmed}`,
            translateOnLogLine(
              deps.uiSettings.locale,
              settingTokenForPairId(deps.translatePairIdRef.current)
            )
          ])
          deps.focusPrompt()
        } else if (translateCmd.kind === "off") {
          await saveTranslateEnabled(false)
          deps.setTranslateEnabled(false)
          deps.setModeToolbarOrder((prev: any) => deactivateModeToolbar(prev, "translate"))
          await deps.appendLogLines([`> ${trimmed}`, deps.uiCopy.t("translate.off")])
          deps.activatePaneFocus("terminal")
        } else if (translateCmd.kind === "setting") {
          await saveTranslatePair(translateCmd.pair)
          deps.setTranslatePairId(translateCmd.pair)
          deps.resetNavTranslateSession()
          const token = settingTokenForPairId(translateCmd.pair)
          await deps.appendLogLines([`> ${trimmed}`, deps.uiCopy.t("translate.pairSet", { token })])
        }
      })()
      return
    }

    if (parseNavExitLine(trimmed)) {
      deps.appendCommandToHistory(trimmed)
      deps.setLine("")
      deps.setCursorPos(0)
      deps.setHistNavIndex(-1)
      deps.tabPressSeqRef.current = 0
      void (async () => {
        const logLines = [`> ${trimmed}`]
        if (deps.navActiveRef.current) {
          logLines.push(deps.uiCopy.t("nav.exitActiveError"))
        } else if (!deps.navArmedRef.current) {
          logLines.push(deps.uiCopy.t("nav.notArmed"))
        } else {
          await deps.teardownNav()
          deps.navPositionsRef.current = {}
          deps.setNavArmed(false)
          deps.setNavActive(false)
          deps.setModeToolbarOrder((prev: any) => deactivateModeToolbar(prev, "nav"))
          logLines.push(deps.uiCopy.t("nav.disarmed"))
        }
        await deps.appendLogLines(logLines)
        deps.focusPrompt()
      })()
      return
    }

    if (parseDomExitListLine(trimmed)) {
      deps.appendCommandToHistory(trimmed)
      deps.setLine("")
      deps.setCursorPos(0)
      deps.setHistNavIndex(-1)
      deps.tabPressSeqRef.current = 0
      void (async () => {
        const logLines = [`> ${trimmed}`]
        const hadActiveDomJob = deps.jobRunner.isActive("dom-list")
        if (hadActiveDomJob) {
          deps.jobRunner.cancel("dom-list")
        }
        if (deps.domListPickerRef.current !== null) {
          deps.setDomListPicker(deps.sessionId, null)
          deps.setModeToolbarOrder((prev: any) => deactivateModeToolbar(prev, "dom"))
          deps.activatePaneFocus("terminal")
          logLines.push(deps.uiCopy.t("dom.picker.closed"))
        } else {
          logLines.push(deps.uiCopy.t("dom.picker.notOpen"))
        }
        await deps.appendLogLines(logLines)
        deps.focusPrompt()
      })()
      return
    }

    if (parseGroupNewInteractiveLine(trimmed)) {
      deps.appendCommandToHistory(trimmed)
      deps.setLine("")
      deps.setCursorPos(0)
      deps.setHistNavIndex(-1)
      deps.tabPressSeqRef.current = 0
      void (async () => {
        try {
          const rows = await buildTabPickerRows(false, deps.uiSettings.locale)
          const initialHi = await resolveInitialTabPickerHighlightIndex(rows)
          await deps.appendLogLines([`> ${trimmed}`, deps.uiCopy.t("group.newPicker")])
          deps.setTabPicker(
            deps.sessionId,
            openTabPickerEngineForSession(deps.sessionId, {
              rows,
              showUrl: false,
              initialHi,
              variant: "groupNew"
            })
          )
          deps.setModeToolbarOrder((prev: any) => activateModeToolbar(prev, "tabs"))
        } catch (e) {
          await deps.appendLogLines([
            `> ${trimmed}`,
            deps.uiCopy.t("error.generic", {
              message: e instanceof Error ? e.message : String(e)
            })
          ])
        }
      })()
      return
    }

    const searchListLine = parseSearchListPickerLine(trimmed)
    if (searchListLine !== null) {
      if (isSearchListContinuationPrompt(rawLine)) {
        deps.appendCommandToHistory(trimmed)
        const next = `${trimmed} `
        deps.lineRef.current = next
        deps.setLine(next)
        deps.setCursorPos(next.length)
        deps.setHistNavIndex(-1)
        deps.tabPressSeqRef.current = 0
        deps.setSubCmdPicker(null)
        deps.focusPrompt()
        return
      }
      if (!isSearchListReadyToRun(trimmed, rawLine)) {
        deps.focusPrompt()
        return
      }
      deps.appendCommandToHistory(trimmed)
      deps.setLine("")
      deps.setCursorPos(0)
      deps.setHistNavIndex(-1)
      deps.tabPressSeqRef.current = 0
      deps.setSubCmdPicker(null)
      void deps.runSearchListSearch(trimmed, searchListLine)
      return
    }

    if (trimmed === "help" || trimmed === "?") {
      deps.appendCommandToHistory(trimmed)
      deps.setLine("")
      deps.setCursorPos(0)
      deps.setHistNavIndex(-1)
      deps.tabPressSeqRef.current = 0
      void deps.appendLogLines([`> ${trimmed}`, ...buildHelpLines(deps.uiSettings.locale)])
      deps.focusPrompt()
      return
    }

    const domListLine = parseDomListPickerLine(trimmed)
    if (domListLine !== null) {
      deps.appendCommandToHistory(trimmed)
      deps.setLine("")
      deps.setCursorPos(0)
      deps.setHistNavIndex(-1)
      deps.tabPressSeqRef.current = 0
      deps.setSubCmdPicker(null)
      void deps.runDomListAndShow(domListLine, trimmed, /*announce*/ true)
      return
    }

    deps.appendCommandToHistory(trimmed)
    const continuationPrompt = continuationPromptAfterLoneFirstToken(trimmed)
    deps.setLine("")
    deps.setCursorPos(0)
    deps.setHistNavIndex(-1)
    deps.tabPressSeqRef.current = 0
    chrome.runtime.sendMessage(
      { type: "RUN_CMD", line: trimmed, sessionId: deps.sessionId },
      (response) => {
        const err = chrome.runtime.lastError
        if (err) {
          void deps.appendLogLines([
            `> ${trimmed}`,
            deps.uiCopy.t("error.dispatchFailed", { message: err.message })
          ])
          return
        }
        if (response && typeof response === "object" && "ok" in response && response.ok === false) {
          const msg =
            "error" in response && typeof response.error === "string"
              ? response.error
              : deps.uiCopy.t("error.unknown")
          void deps.appendLogLines([
            `> ${trimmed}`,
            deps.uiCopy.t("error.generic", { message: msg })
          ])
        }
      }
    )
    if (continuationPrompt) {
      deps.setSubCmdPicker(null)
      deps.setLine(continuationPrompt)
      deps.setCursorPos(continuationPrompt.length)
      deps.lineRef.current = continuationPrompt
    }
    deps.focusPrompt()
  }, [deps])

  return { submitLine }
}
