import { buildHelpLines } from "../../bmxt-core/registry/help.ts"
import { parseDomExitListLine } from "../../dom/dom-list-picker-input.ts"
import {
  saveDomPageActiveMode,
  settingTokenForDomPageActiveMode
} from "../../dom/page-active-setting.ts"
import { parseDomSettingCommandLine } from "../../dom/parse-dom-setting-command.ts"
import { canScriptHttpHostPages } from "../../extension-permissions/optional-http-hosts.ts"
import { parseGroupNewInteractiveLine, parseTabsExitListLine } from "../../tabs/input.ts"
import { buildTabPickerRowsBundle, resolveInitialTabPickerHighlightIndex } from "../../tabs/picker-rows.ts"
import { closeTabPickerEngineForSession, openTabPickerEngineForSession } from "../../tabs/engine"
import {
  saveTabsPageActiveMode,
  settingTokenForPageActiveMode
} from "../../tabs/page-active-setting.ts"
import { parseTabsSettingCommandLine } from "../../tabs/parse-tabs-setting-command.ts"
import { parseNavEnterLine, parseNavExitLine } from "../../nav/index.ts"
import { parseSearchExitListLine } from "../../search/search-list-picker-input.ts"
import { parseSnapshotSaveLine } from "../../snapshot/snapshot-save-input.ts"
import { snapshotSaveLogLinesForResult } from "../../snapshot/snapshot-save-log-lines.ts"
import { saveSnapshotFromTab } from "../../snapshot/snapshot-save-tab.ts"
import {
  parseSessionSettingNameWithLine,
  parseSessionSwitchByNumberLine,
  parseSessionSwitchWithLine,
  resolveSessionRowByDisplayName,
  sanitizeSessionName
} from "../../session/index.ts"
import { tryRunPlainListCommand } from "../list-commands/index.ts"
import { parseSettingExitListLine } from "../../setting/setting-list-picker-input.ts"
import {
  parseTranslateCommandLine,
  saveTranslateEnabled,
  saveTranslatePair,
  settingTokenForPairId
} from "../../translate/index.ts"
import { translateOnLogLine } from "../../setting/i18n/resolvers.ts"
import type { CommandDispatchDeps } from "../../bmxt-window/shell/command-dispatch/types.ts"
import type { UiLocale } from "../../setting/locale.ts"
import { tDom } from "../../setting/i18n/ns/dom.ts"
import { tError } from "../../setting/i18n/ns/error.ts"
import { tGroup } from "../../setting/i18n/ns/group.ts"
import { tNav } from "../../setting/i18n/ns/nav.ts"
import { tSearch } from "../../setting/i18n/ns/search.ts"
import { tSession } from "../../setting/i18n/ns/session.ts"
import { tSetting } from "../../setting/i18n/ns/setting.ts"
import { tTabs } from "../../setting/i18n/ns/tabs.ts"
import { tTranslate } from "../../setting/i18n/ns/translate.ts"
import { activateModeToolbar, deactivateModeToolbar } from "../../bmxt-window/mode-toolbar-order.ts"
import { mountTabPickerLoadingColumn } from "../../bmxt-window/shell/command-dispatch/open-tab-picker-column.ts"
import { segmentFailure, segmentSuccess } from "./classify-outcome.ts"
import type { SegmentOutcome } from "./types.ts"

/** EN: UI command runners registered in `commands/registry.ts` (order = dispatch order). */
export const UI_COMMAND_RUNNERS = {
  setting: runSettingSegment,
  tabsSetting: runTabsSettingSegment,
  domSetting: runDomSettingSegment,
  session: runSessionSegment,
  tabsList: runTabsListSegment,
  searchExit: runSearchExitSegment,
  navEnter: runNavEnterSegment,
  translate: runTranslateSegment,
  navExit: runNavExitSegment,
  domExit: runDomExitSegment,
  groupNew: runGroupNewSegment,
  searchList: runSearchListSegment,
  help: runHelpSegment,
  domList: runDomListSegment,
  snapshot: runSnapshotSegment
} as const

async function runSettingSegment(
  segment: string,
  deps: CommandDispatchDeps,
  locale: UiLocale
): Promise<SegmentOutcome | null> {
  const plainLines = await tryRunPlainListCommand(segment, { locale, deps })
  if (plainLines !== null) {
    return segmentSuccess(plainLines)
  }

  if (parseSettingExitListLine(segment)) {
    const lines: string[] = []
    if (deps.settingListPickerRef.current !== null) {
      deps.closeSettingPickerColumn()
      lines.push(tSetting("setting.picker.closed", locale))
    } else {
      lines.push(tSetting("setting.picker.notOpen", locale))
    }
    return segmentSuccess(lines)
  }

  return null
}

async function runTabsSettingSegment(
  segment: string,
  deps: CommandDispatchDeps,
  locale: UiLocale
): Promise<SegmentOutcome | null> {
  const cmd = parseTabsSettingCommandLine(segment)
  if (cmd === null || cmd.kind !== "page-active") {
    return null
  }

  await saveTabsPageActiveMode(cmd.mode)
  deps.setTabsPageActiveMode(cmd.mode)
  deps.tabsPageActiveModeRef.current = cmd.mode
  const token = settingTokenForPageActiveMode(cmd.mode)
  return segmentSuccess([tTabs("tabs.pageActive.set", locale, { token })])
}

async function runDomSettingSegment(
  segment: string,
  deps: CommandDispatchDeps,
  locale: UiLocale
): Promise<SegmentOutcome | null> {
  const cmd = parseDomSettingCommandLine(segment)
  if (cmd === null || cmd.kind !== "page-active") {
    return null
  }

  await saveDomPageActiveMode(cmd.mode)
  deps.setDomPageActiveMode(cmd.mode)
  deps.domPageActiveModeRef.current = cmd.mode
  const token = settingTokenForDomPageActiveMode(cmd.mode)
  return segmentSuccess([tDom("dom.pageActive.set", locale, { token })])
}

async function runSessionSegment(
  segment: string,
  deps: CommandDispatchDeps,
  locale: UiLocale
): Promise<SegmentOutcome | null> {
  const plainLines = await tryRunPlainListCommand(segment, { locale, deps })
  if (plainLines !== null) {
    return segmentSuccess(plainLines)
  }

  const settingName = parseSessionSettingNameWithLine(segment)
  if (settingName !== null) {
    const sanitized = sanitizeSessionName(settingName)
    if (!sanitized) {
      return segmentFailure("runtime", [tSession("session.settingName.invalid", locale)])
    }
    await deps.onSetSessionDisplayName(deps.sessionId, sanitized)
    return segmentSuccess([
      tSession("session.settingName.saved", locale, { name: sanitized })
    ])
  }

  const switchName = parseSessionSwitchWithLine(segment)
  if (switchName !== null) {
    const row = resolveSessionRowByDisplayName(deps.sessionListRows, switchName)
    if (!row) {
      return segmentFailure("runtime", [
        tSession("session.switch.notFound", locale, { name: switchName })
      ])
    }
    await deps.onActivateSession(row.sessionId)
    return segmentSuccess([
      tSession("session.switch.switched", locale, { name: row.displayName })
    ])
  }

  const sessionNumber = parseSessionSwitchByNumberLine(segment)
  if (sessionNumber !== null) {
    const row = deps.sessionListRows[sessionNumber - 1]
    if (!row) {
      return segmentFailure("runtime", [
        tSession("session.number.invalid", locale, {
          n: String(sessionNumber),
          max: String(deps.sessionListRows.length)
        })
      ])
    }
    await deps.onActivateSession(row.sessionId)
    return segmentSuccess([
      tSession("session.number.switched", locale, { n: String(sessionNumber) })
    ])
  }

  return null
}

async function runTabsListSegment(
  segment: string,
  deps: CommandDispatchDeps,
  locale: UiLocale
): Promise<SegmentOutcome | null> {
  if (parseTabsExitListLine(segment)) {
    const lines: string[] = []
    if (deps.tabPickerRef.current !== null) {
      closeTabPickerEngineForSession(deps.sessionId)
      deps.setTabPicker(deps.sessionId, null)
      deps.setModeToolbarOrder((prev) => deactivateModeToolbar(prev, "tabs"))
      deps.activatePaneFocus("terminal")
      lines.push(tTabs("tabs.picker.closed", locale))
    } else {
      lines.push(tTabs("tabs.picker.notOpen", locale))
    }
    return segmentSuccess(lines)
  }

  return null
}

async function runSearchExitSegment(
  segment: string,
  deps: CommandDispatchDeps,
  locale: UiLocale
): Promise<SegmentOutcome | null> {
  if (!parseSearchExitListLine(segment)) {
    return null
  }

  const lines: string[] = []
  const hadActiveJob = deps.jobRunner.isActive("search-list")
  if (hadActiveJob) {
    deps.jobRunner.cancel("search-list")
  }
  deps.clearSearchLoadingProgress()
  if (deps.searchListPickerRef.current !== null) {
    deps.setSearchListPicker(deps.sessionId, null)
    deps.setModeToolbarOrder((prev) => deactivateModeToolbar(prev, "search"))
    deps.activatePaneFocus("terminal")
    lines.push(tSearch("search.picker.closed", locale))
  } else if (hadActiveJob) {
    lines.push(tSearch("search.picker.cancelled", locale))
  } else {
    lines.push(tSearch("search.picker.notOpen", locale))
  }
  return segmentSuccess(lines)
}

async function runNavEnterSegment(
  segment: string,
  deps: CommandDispatchDeps,
  locale: UiLocale
): Promise<SegmentOutcome | null> {
  if (!parseNavEnterLine(segment)) {
    return null
  }

  deps.setNavArmed(true)
  deps.setNavActive(false)
  deps.setModeToolbarOrder((prev) => activateModeToolbar(prev, "nav"))
  const canPage = await canScriptHttpHostPages()
  const lines = [tNav("nav.armedLog", locale)]
  if (!canPage) {
    lines.push(tNav("nav.hostAccessWarning", locale))
  }
  return segmentSuccess(lines)
}

async function runTranslateSegment(
  segment: string,
  deps: CommandDispatchDeps,
  locale: UiLocale
): Promise<SegmentOutcome | null> {
  const translateCmd = parseTranslateCommandLine(segment)
  if (translateCmd === null) {
    return null
  }

  if (translateCmd.kind === "on") {
    await saveTranslateEnabled(true)
    deps.setTranslateEnabled(true)
    deps.setModeToolbarOrder((prev) => activateModeToolbar(prev, "translate"))
    return segmentSuccess([
      translateOnLogLine(deps.uiSettings.locale, settingTokenForPairId(deps.translatePairIdRef.current))
    ])
  }

  if (translateCmd.kind === "off") {
    await saveTranslateEnabled(false)
    deps.setTranslateEnabled(false)
    deps.setModeToolbarOrder((prev) => deactivateModeToolbar(prev, "translate"))
    deps.activatePaneFocus("terminal")
    return segmentSuccess([tTranslate("translate.off", locale)])
  }

  if (translateCmd.kind === "setting") {
    await saveTranslatePair(translateCmd.pair)
    deps.setTranslatePairId(translateCmd.pair)
    deps.resetNavTranslateSession()
    const token = settingTokenForPairId(translateCmd.pair)
    return segmentSuccess([tTranslate("translate.pairSet", locale, { token })])
  }

  return null
}

async function runNavExitSegment(
  segment: string,
  deps: CommandDispatchDeps,
  locale: UiLocale
): Promise<SegmentOutcome | null> {
  if (!parseNavExitLine(segment)) {
    return null
  }

  if (deps.navActiveRef.current) {
    return segmentFailure("runtime", [tNav("nav.exitActiveError", locale)])
  }
  if (!deps.navArmedRef.current) {
    return segmentSuccess([tNav("nav.notArmed", locale)])
  }

  await deps.teardownNav()
  deps.navPositionsRef.current = {}
  deps.setNavArmed(false)
  deps.setNavActive(false)
  deps.setModeToolbarOrder((prev) => deactivateModeToolbar(prev, "nav"))
  return segmentSuccess([tNav("nav.disarmed", locale)])
}

async function runDomExitSegment(
  segment: string,
  deps: CommandDispatchDeps,
  locale: UiLocale
): Promise<SegmentOutcome | null> {
  if (!parseDomExitListLine(segment)) {
    return null
  }

  const lines: string[] = []
  const hadActiveDomJob = deps.jobRunner.isActive("dom-list")
  if (hadActiveDomJob) {
    deps.jobRunner.cancel("dom-list")
  }
  if (deps.domListPickerRef.current !== null) {
    deps.setDomListPicker(deps.sessionId, null)
    deps.setModeToolbarOrder((prev) => deactivateModeToolbar(prev, "dom"))
    deps.activatePaneFocus("terminal")
    lines.push(tDom("dom.picker.closed", locale))
  } else {
    lines.push(tDom("dom.picker.notOpen", locale))
  }
  return segmentSuccess(lines)
}

async function runGroupNewSegment(
  segment: string,
  deps: CommandDispatchDeps,
  locale: UiLocale
): Promise<SegmentOutcome | null> {
  if (!parseGroupNewInteractiveLine(segment)) {
    return null
  }

  deps.setTabPicker(deps.sessionId, mountTabPickerLoadingColumn(deps.sessionId, false, "groupNew"))
  deps.setModeToolbarOrder((prev) => activateModeToolbar(prev, "tabs"))
  try {
    const { rows, lastNormalWindowId } = await buildTabPickerRowsBundle(false, deps.uiSettings.locale)
    const initialHi = resolveInitialTabPickerHighlightIndex(rows, lastNormalWindowId)
    deps.setTabPicker(
      deps.sessionId,
      openTabPickerEngineForSession(deps.sessionId, {
        rows,
        showUrl: false,
        initialHi,
        variant: "groupNew"
      })
    )
    return segmentSuccess([tGroup("group.newPicker", locale)])
  } catch (e) {
    if (deps.tabPickerRef.current?.rows.length === 0) {
      closeTabPickerEngineForSession(deps.sessionId)
      deps.setTabPicker(deps.sessionId, null)
      deps.setModeToolbarOrder((prev) => deactivateModeToolbar(prev, "tabs"))
    }
    const message = e instanceof Error ? e.message : String(e)
    return segmentFailure("runtime", [
      tError("error.generic", locale, { message })
    ], message)
  }
}

async function runSearchListSegment(
  _segment: string,
  _deps: CommandDispatchDeps,
  _locale: UiLocale
): Promise<SegmentOutcome | null> {
  // EN: Plain `search -list` is handled by `plain-list` CommandEntry.
  // Picker UI is `search -list … | picker` only.
  return null
}

async function runHelpSegment(
  segment: string,
  deps: CommandDispatchDeps,
  locale: UiLocale
): Promise<SegmentOutcome | null> {
  if (segment !== "help" && segment !== "?") {
    return null
  }
  return segmentSuccess(buildHelpLines(deps.uiSettings.locale))
}

async function runDomListSegment(
  _segment: string,
  _deps: CommandDispatchDeps,
  _locale: UiLocale
): Promise<SegmentOutcome | null> {
  // EN: Plain `dom -list` is handled by `plain-list` CommandEntry.
  // Picker UI is `dom -list … | picker` only.
  return null
}

async function runSnapshotSegment(
  segment: string,
  deps: CommandDispatchDeps,
  locale: UiLocale
): Promise<SegmentOutcome | null> {
  const parsed = parseSnapshotSaveLine(segment)
  if (parsed === null) {
    return null
  }

  deps.setSubCmdPicker(null)
  const result = await saveSnapshotFromTab(parsed.tabId, { sessionId: deps.sessionId })
  const lines = snapshotSaveLogLinesForResult(locale, result)
  if (result.ok) {
    return segmentSuccess(lines)
  }
  return segmentFailure("runtime", lines, lines[0])
}
