import { buildHelpLines } from "../../bmxt-core/registry/help"
import { tryRunPlainListCommand } from "../../command-line/list-commands"
import { segmentFailure, segmentSuccess } from "../../command-line/compound/classify-outcome"
import type { SegmentOutcome } from "../../command-line/compound/types"
import {
  saveDomPageActiveMode,
  settingTokenForDomPageActiveMode
} from "../../dom/page-active-setting"
import { canScriptHttpHostPages } from "../../extension-permissions/optional-http-hosts"
import { runBrowseCommand } from "../../picker/run-picker-command"
import { saveSnapshotFromTab } from "../../snapshot/snapshot-save-tab"
import { snapshotSaveLogLinesForResult } from "../../snapshot/snapshot-save-log-lines"
import { resolveSessionRowByDisplayName } from "../../session"
import { parseSnapshotSaveLine } from "../../snapshot/snapshot-save-input"
import { tDom } from "../../setting/i18n/ns/dom"
import { tError } from "../../setting/i18n/ns/error"
import { tGroup } from "../../setting/i18n/ns/group"
import { tNav } from "../../setting/i18n/ns/nav"
import { tSearch } from "../../setting/i18n/ns/search"
import { tSession } from "../../setting/i18n/ns/session"
import { tSetting } from "../../setting/i18n/ns/setting"
import { tTabs } from "../../setting/i18n/ns/tabs"
import { tTranslate } from "../../setting/i18n/ns/translate"
import { translateOnLogLine } from "../../setting/i18n/resolvers"
import { closeTabPickerEngineForSession, openTabPickerEngineForSession } from "../../tabs/engine"
import { buildTabPickerRowsBundle, resolveInitialTabPickerHighlightIndex } from "../../tabs/picker-rows"
import {
  saveTabsPageActiveMode,
  settingTokenForPageActiveMode
} from "../../tabs/page-active-setting"
import {
  pairIdFromSettingToken,
  saveTranslateEnabled,
  saveTranslatePair,
  settingTokenForPairId,
  type TranslationPairId
} from "../../translate"
import type { UiActionIR } from "../../dispatch/ui-action-types"
import { activateModeToolbar, deactivateModeToolbar } from "../mode-toolbar-order"
import { mountTabPickerLoadingColumn } from "./command-dispatch/open-tab-picker-column"
import {
  clearPrompt,
  recordCommandHistory,
  setContinuationPrompt,
  type CommandDispatchContext
} from "./command-dispatch/types"

function finishCommand(ctx: CommandDispatchContext): void {
  ctx.deps.appendCommandToHistory(ctx.trimmed)
  clearPrompt(ctx.deps)
  recordCommandHistory(ctx.deps)
}

function recordOnly(ctx: CommandDispatchContext): void {
  ctx.deps.appendCommandToHistory(ctx.trimmed)
  recordCommandHistory(ctx.deps)
}

/** Apply opaque UiActionIR from WASM. Returns true if handled. */
export function applyUiAction(action: UiActionIR, ctx: CommandDispatchContext): boolean {
  switch (action.kind) {
    case "picker_pass":
      return false
    case "show_help":
      return applyShowHelp(ctx)
    case "nav_arm":
      return applyNavArm(ctx)
    case "nav_disarm":
      return applyNavDisarm(ctx)
    case "setting_list":
      return applySettingList(ctx)
    case "setting_exit_list":
      return applySettingExitList(ctx)
    case "tabs_exit_list":
      return applyTabsExitList(ctx)
    case "tabs_setting":
      return applyTabsSetting(ctx, action.mode)
    case "search_exit_list":
      return applySearchExitList(ctx)
    case "dom_exit_list":
      return applyDomExitList(ctx)
    case "dom_setting":
      return applyDomSetting(ctx, action.mode)
    case "session_list":
      return applySessionList(ctx)
    case "session_switch":
      return applySessionSwitch(ctx, action.name)
    case "session_setting_name":
      return applySessionSettingName(ctx, action.name)
    case "group_new_from_selection":
      return applyGroupNewFromSelection(ctx)
    case "translate_on":
      return applyTranslateOn(ctx)
    case "translate_off":
      return applyTranslateOff(ctx)
    case "translate_setting":
      return applyTranslateSetting(ctx, action.pair)
    case "snapshot_save":
      return applySnapshotSave(ctx, action.line)
    case "browse":
      return applyBrowse(ctx, action.line)
    case "open_plain_list":
      return applyOpenPlainList(ctx, action.line)
    case "close_picker":
      return applyClosePicker(ctx, action.slot)
    case "continuation_prompt":
      return applyContinuationPrompt(ctx, action.prefix)
    default: {
      const _exhaustive: never = action
      return _exhaustive
    }
  }
}

/** EN: Compound segment path — async outcome with stdout lines (no `> segment` prefix). */
export async function applyUiActionForSegment(
  action: UiActionIR,
  ctx: CommandDispatchContext
): Promise<SegmentOutcome | null> {
  if (action.kind === "picker_pass") {
    return null
  }

  switch (action.kind) {
    case "show_help":
      return segmentSuccess(buildHelpLines(ctx.deps.uiSettings.locale))
    case "nav_arm":
      return applyNavArmSegment(ctx)
    case "nav_disarm":
      return applyNavDisarmSegment(ctx)
    case "setting_list":
      return applyPlainListSegment(ctx, ctx.trimmed)
    case "setting_exit_list":
      return applySettingExitListSegment(ctx)
    case "tabs_exit_list":
      return applyTabsExitListSegment(ctx)
    case "tabs_setting":
      return applyTabsSettingSegment(ctx, action.mode)
    case "search_exit_list":
      return applySearchExitListSegment(ctx)
    case "dom_exit_list":
      return applyDomExitListSegment(ctx)
    case "dom_setting":
      return applyDomSettingSegment(ctx, action.mode)
    case "session_list":
      return applyPlainListSegment(ctx, ctx.trimmed)
    case "session_switch":
      return applySessionSwitchSegment(ctx, action.name)
    case "session_setting_name":
      return applySessionSettingNameSegment(ctx, action.name)
    case "group_new_from_selection":
      return applyGroupNewSegment(ctx)
    case "translate_on":
      return applyTranslateOnSegment(ctx)
    case "translate_off":
      return applyTranslateOffSegment(ctx)
    case "translate_setting":
      return applyTranslateSettingSegment(ctx, action.pair)
    case "snapshot_save":
      return applySnapshotSaveSegment(ctx, action.line)
    case "browse":
      return applyBrowseSegment(ctx, action.line)
    case "open_plain_list":
      return applyPlainListSegment(ctx, action.line)
    case "close_picker":
      return applyClosePickerSegment(ctx, action.slot)
    case "continuation_prompt":
      return segmentFailure("continuation", [
        `continuation required: ${ctx.trimmed}`
      ])
    default: {
      const _exhaustive: never = action
      return _exhaustive
    }
  }
}

function applyShowHelp(ctx: CommandDispatchContext): boolean {
  finishCommand(ctx)
  void (async () => {
    await ctx.deps.appendLogLines([
      `> ${ctx.trimmed}`,
      ...buildHelpLines(ctx.deps.uiSettings.locale)
    ])
    ctx.deps.focusPrompt()
  })()
  return true
}

function applyNavArm(ctx: CommandDispatchContext): boolean {
  finishCommand(ctx)
  ctx.deps.setNavArmed(true)
  ctx.deps.setNavActive(false)
  ctx.deps.setModeToolbarOrder((prev) => activateModeToolbar(prev, "nav"))
  void (async () => {
    const canPage = await canScriptHttpHostPages()
    const logLines = [`> ${ctx.trimmed}`, tNav("nav.armedLog", ctx.locale)]
    if (!canPage) {
      logLines.push(tNav("nav.hostAccessWarning", ctx.locale))
    }
    await ctx.deps.appendLogLines(logLines)
    ctx.deps.focusPrompt()
  })()
  return true
}

async function applyNavArmSegment(ctx: CommandDispatchContext): Promise<SegmentOutcome> {
  ctx.deps.setNavArmed(true)
  ctx.deps.setNavActive(false)
  ctx.deps.setModeToolbarOrder((prev) => activateModeToolbar(prev, "nav"))
  const canPage = await canScriptHttpHostPages()
  const lines = [tNav("nav.armedLog", ctx.locale)]
  if (!canPage) {
    lines.push(tNav("nav.hostAccessWarning", ctx.locale))
  }
  return segmentSuccess(lines)
}

function applyNavDisarm(ctx: CommandDispatchContext): boolean {
  finishCommand(ctx)
  void (async () => {
    const logLines = [`> ${ctx.trimmed}`]
    if (ctx.deps.navActiveRef.current) {
      logLines.push(tNav("nav.exitActiveError", ctx.locale))
    } else if (!ctx.deps.navArmedRef.current) {
      logLines.push(tNav("nav.notArmed", ctx.locale))
    } else {
      await ctx.deps.teardownNav()
      ctx.deps.navPositionsRef.current = {}
      ctx.deps.setNavArmed(false)
      ctx.deps.setNavActive(false)
      ctx.deps.setModeToolbarOrder((prev) => deactivateModeToolbar(prev, "nav"))
      logLines.push(tNav("nav.disarmed", ctx.locale))
    }
    await ctx.deps.appendLogLines(logLines)
    ctx.deps.focusPrompt()
  })()
  return true
}

async function applyNavDisarmSegment(ctx: CommandDispatchContext): Promise<SegmentOutcome> {
  if (ctx.deps.navActiveRef.current) {
    return segmentFailure("runtime", [tNav("nav.exitActiveError", ctx.locale)])
  }
  if (!ctx.deps.navArmedRef.current) {
    return segmentSuccess([tNav("nav.notArmed", ctx.locale)])
  }
  await ctx.deps.teardownNav()
  ctx.deps.navPositionsRef.current = {}
  ctx.deps.setNavArmed(false)
  ctx.deps.setNavActive(false)
  ctx.deps.setModeToolbarOrder((prev) => deactivateModeToolbar(prev, "nav"))
  return segmentSuccess([tNav("nav.disarmed", ctx.locale)])
}

function applySettingList(ctx: CommandDispatchContext): boolean {
  finishCommand(ctx)
  void (async () => {
    const lines = await tryRunPlainListCommand(ctx.trimmed, {
      locale: ctx.locale,
      deps: ctx.deps
    })
    await ctx.deps.appendLogLines([`> ${ctx.trimmed}`, ...(lines ?? [])])
    ctx.deps.focusPrompt()
  })()
  return true
}

function applySettingExitList(ctx: CommandDispatchContext): boolean {
  finishCommand(ctx)
  void (async () => {
    const logLines = [`> ${ctx.trimmed}`]
    if (ctx.deps.settingListPickerRef.current !== null) {
      ctx.deps.closeSettingPickerColumn()
      logLines.push(tSetting("setting.picker.closed", ctx.locale))
    } else {
      logLines.push(tSetting("setting.picker.notOpen", ctx.locale))
    }
    await ctx.deps.appendLogLines(logLines)
    ctx.deps.focusPrompt()
  })()
  return true
}

async function applySettingExitListSegment(ctx: CommandDispatchContext): Promise<SegmentOutcome> {
  const lines: string[] = []
  if (ctx.deps.settingListPickerRef.current !== null) {
    ctx.deps.closeSettingPickerColumn()
    lines.push(tSetting("setting.picker.closed", ctx.locale))
  } else {
    lines.push(tSetting("setting.picker.notOpen", ctx.locale))
  }
  return segmentSuccess(lines)
}

function applyTabsExitList(ctx: CommandDispatchContext): boolean {
  finishCommand(ctx)
  void (async () => {
    const logLines = [`> ${ctx.trimmed}`]
    if (ctx.deps.tabPickerRef.current !== null) {
      closeTabPickerEngineForSession(ctx.deps.sessionId)
      ctx.deps.setTabPicker(ctx.deps.sessionId, null)
      ctx.deps.setModeToolbarOrder((prev) => deactivateModeToolbar(prev, "tabs"))
      ctx.deps.activatePaneFocus("terminal")
      logLines.push(tTabs("tabs.picker.closed", ctx.locale))
    } else {
      logLines.push(tTabs("tabs.picker.notOpen", ctx.locale))
    }
    await ctx.deps.appendLogLines(logLines)
    ctx.deps.focusPrompt()
  })()
  return true
}

async function applyTabsExitListSegment(ctx: CommandDispatchContext): Promise<SegmentOutcome> {
  const lines: string[] = []
  if (ctx.deps.tabPickerRef.current !== null) {
    closeTabPickerEngineForSession(ctx.deps.sessionId)
    ctx.deps.setTabPicker(ctx.deps.sessionId, null)
    ctx.deps.setModeToolbarOrder((prev) => deactivateModeToolbar(prev, "tabs"))
    ctx.deps.activatePaneFocus("terminal")
    lines.push(tTabs("tabs.picker.closed", ctx.locale))
  } else {
    lines.push(tTabs("tabs.picker.notOpen", ctx.locale))
  }
  return segmentSuccess(lines)
}

function applyTabsSetting(ctx: CommandDispatchContext, modeRaw: string): boolean {
  const mode = modeRaw === "manual" ? "manual" : modeRaw === "auto" ? "auto" : null
  if (mode === null) {
    return false
  }
  finishCommand(ctx)
  ctx.deps.lineRef.current = ""
  void (async () => {
    await saveTabsPageActiveMode(mode)
    ctx.deps.setTabsPageActiveMode(mode)
    ctx.deps.tabsPageActiveModeRef.current = mode
    const token = settingTokenForPageActiveMode(mode)
    await ctx.deps.appendLogLines([`> ${ctx.trimmed}`, tTabs("tabs.pageActive.set", ctx.locale, { token })])
    ctx.deps.focusPrompt()
  })()
  return true
}

async function applyTabsSettingSegment(
  ctx: CommandDispatchContext,
  modeRaw: string
): Promise<SegmentOutcome> {
  const mode = modeRaw === "manual" ? "manual" : modeRaw === "auto" ? "auto" : null
  if (mode === null) {
    return segmentFailure("usage", [tError("error.generic", ctx.locale, { message: ctx.trimmed })])
  }
  await saveTabsPageActiveMode(mode)
  ctx.deps.setTabsPageActiveMode(mode)
  ctx.deps.tabsPageActiveModeRef.current = mode
  const token = settingTokenForPageActiveMode(mode)
  return segmentSuccess([tTabs("tabs.pageActive.set", ctx.locale, { token })])
}

function applySearchExitList(ctx: CommandDispatchContext): boolean {
  finishCommand(ctx)
  void (async () => {
    const logLines = [`> ${ctx.trimmed}`]
    const hadActiveJob = ctx.deps.jobRunner.isActive("search-list")
    if (hadActiveJob) {
      ctx.deps.jobRunner.cancel("search-list")
    }
    ctx.deps.clearSearchLoadingProgress()
    if (ctx.deps.searchListPickerRef.current !== null) {
      ctx.deps.setSearchListPicker(ctx.deps.sessionId, null)
      ctx.deps.setModeToolbarOrder((prev) => deactivateModeToolbar(prev, "search"))
      ctx.deps.activatePaneFocus("terminal")
      logLines.push(tSearch("search.picker.closed", ctx.locale))
    } else if (hadActiveJob) {
      logLines.push(tSearch("search.picker.cancelled", ctx.locale))
    } else {
      logLines.push(tSearch("search.picker.notOpen", ctx.locale))
    }
    await ctx.deps.appendLogLines(logLines)
    ctx.deps.focusPrompt()
  })()
  return true
}

async function applySearchExitListSegment(ctx: CommandDispatchContext): Promise<SegmentOutcome> {
  const lines: string[] = []
  const hadActiveJob = ctx.deps.jobRunner.isActive("search-list")
  if (hadActiveJob) {
    ctx.deps.jobRunner.cancel("search-list")
  }
  ctx.deps.clearSearchLoadingProgress()
  if (ctx.deps.searchListPickerRef.current !== null) {
    ctx.deps.setSearchListPicker(ctx.deps.sessionId, null)
    ctx.deps.setModeToolbarOrder((prev) => deactivateModeToolbar(prev, "search"))
    ctx.deps.activatePaneFocus("terminal")
    lines.push(tSearch("search.picker.closed", ctx.locale))
  } else if (hadActiveJob) {
    lines.push(tSearch("search.picker.cancelled", ctx.locale))
  } else {
    lines.push(tSearch("search.picker.notOpen", ctx.locale))
  }
  return segmentSuccess(lines)
}

function applyDomExitList(ctx: CommandDispatchContext): boolean {
  finishCommand(ctx)
  void (async () => {
    const logLines = [`> ${ctx.trimmed}`]
    const hadActiveDomJob = ctx.deps.jobRunner.isActive("dom-list")
    if (hadActiveDomJob) {
      ctx.deps.jobRunner.cancel("dom-list")
    }
    if (ctx.deps.domListPickerRef.current !== null) {
      ctx.deps.setDomListPicker(ctx.deps.sessionId, null)
      ctx.deps.setModeToolbarOrder((prev) => deactivateModeToolbar(prev, "dom"))
      ctx.deps.activatePaneFocus("terminal")
      logLines.push(tDom("dom.picker.closed", ctx.locale))
    } else {
      logLines.push(tDom("dom.picker.notOpen", ctx.locale))
    }
    await ctx.deps.appendLogLines(logLines)
    ctx.deps.focusPrompt()
  })()
  return true
}

async function applyDomExitListSegment(ctx: CommandDispatchContext): Promise<SegmentOutcome> {
  const lines: string[] = []
  const hadActiveDomJob = ctx.deps.jobRunner.isActive("dom-list")
  if (hadActiveDomJob) {
    ctx.deps.jobRunner.cancel("dom-list")
  }
  if (ctx.deps.domListPickerRef.current !== null) {
    ctx.deps.setDomListPicker(ctx.deps.sessionId, null)
    ctx.deps.setModeToolbarOrder((prev) => deactivateModeToolbar(prev, "dom"))
    ctx.deps.activatePaneFocus("terminal")
    lines.push(tDom("dom.picker.closed", ctx.locale))
  } else {
    lines.push(tDom("dom.picker.notOpen", ctx.locale))
  }
  return segmentSuccess(lines)
}

function applyDomSetting(ctx: CommandDispatchContext, modeRaw: string): boolean {
  const mode = modeRaw === "manual" ? "manual" : modeRaw === "auto" ? "auto" : null
  if (mode === null) {
    return false
  }
  finishCommand(ctx)
  ctx.deps.lineRef.current = ""
  void (async () => {
    await saveDomPageActiveMode(mode)
    ctx.deps.setDomPageActiveMode(mode)
    ctx.deps.domPageActiveModeRef.current = mode
    const token = settingTokenForDomPageActiveMode(mode)
    await ctx.deps.appendLogLines([`> ${ctx.trimmed}`, tDom("dom.pageActive.set", ctx.locale, { token })])
    ctx.deps.focusPrompt()
  })()
  return true
}

async function applyDomSettingSegment(
  ctx: CommandDispatchContext,
  modeRaw: string
): Promise<SegmentOutcome> {
  const mode = modeRaw === "manual" ? "manual" : modeRaw === "auto" ? "auto" : null
  if (mode === null) {
    return segmentFailure("usage", [tError("error.generic", ctx.locale, { message: ctx.trimmed })])
  }
  await saveDomPageActiveMode(mode)
  ctx.deps.setDomPageActiveMode(mode)
  ctx.deps.domPageActiveModeRef.current = mode
  const token = settingTokenForDomPageActiveMode(mode)
  return segmentSuccess([tDom("dom.pageActive.set", ctx.locale, { token })])
}

function applySessionList(ctx: CommandDispatchContext): boolean {
  finishCommand(ctx)
  void (async () => {
    const lines = await tryRunPlainListCommand(ctx.trimmed, {
      locale: ctx.locale,
      deps: ctx.deps
    })
    await ctx.deps.appendLogLines([`> ${ctx.trimmed}`, ...(lines ?? [])])
    ctx.deps.focusPrompt()
  })()
  return true
}

async function applyPlainListSegment(
  ctx: CommandDispatchContext,
  line: string
): Promise<SegmentOutcome> {
  const lines = await tryRunPlainListCommand(line, { locale: ctx.locale, deps: ctx.deps })
  if (lines === null) {
    return segmentFailure("unknown", [`error: unknown command: ${line}`])
  }
  return segmentSuccess(lines)
}

function applySessionSwitch(ctx: CommandDispatchContext, name: string): boolean {
  if (name.trim().length === 0) {
    ctx.deps.sessionListPickerDismissedRef.current = false
    ctx.deps.syncImeTokenPicker(ctx.deps.lineRef.current, ctx.deps.lineRef.current.length)
    ctx.deps.focusPrompt()
    return true
  }

  finishCommand(ctx)
  const row = resolveSessionRowByDisplayName(ctx.deps.sessionListRows, name)
  void (async () => {
    const logLines = [`> ${ctx.trimmed}`]
    if (!row) {
      logLines.push(tSession("session.switch.notFound", ctx.locale, { name }))
    } else {
      logLines.push(tSession("session.switch.switched", ctx.locale, { name: row.displayName }))
      await ctx.deps.onActivateSession(row.sessionId)
    }
    await ctx.deps.appendLogLines(logLines)
    ctx.deps.focusPrompt()
  })()
  return true
}

async function applySessionSwitchSegment(
  ctx: CommandDispatchContext,
  name: string
): Promise<SegmentOutcome> {
  if (name.trim().length === 0) {
    return segmentFailure("interactive", [tSession("session.switch.notFound", ctx.locale, { name: "" })])
  }
  const row = resolveSessionRowByDisplayName(ctx.deps.sessionListRows, name)
  if (!row) {
    return segmentFailure("runtime", [tSession("session.switch.notFound", ctx.locale, { name })])
  }
  await ctx.deps.onActivateSession(row.sessionId)
  return segmentSuccess([tSession("session.switch.switched", ctx.locale, { name: row.displayName })])
}

function applySessionSettingName(ctx: CommandDispatchContext, name: string): boolean {
  if (name.trim().length === 0) {
    ctx.deps.openSessionNameTyping(ctx.trimmed)
    return true
  }

  recordOnly(ctx)
  ctx.deps.saveSessionDisplayName(name, [`> ${ctx.trimmed}`])
  return true
}

async function applySessionSettingNameSegment(
  ctx: CommandDispatchContext,
  name: string
): Promise<SegmentOutcome> {
  if (name.trim().length === 0) {
    return segmentFailure("interactive", [tSession("session.settingName.invalid", ctx.locale)])
  }
  ctx.deps.saveSessionDisplayName(name, [])
  return segmentSuccess([tSession("session.settingName.saved", ctx.locale, { name })])
}

function applyGroupNewFromSelection(ctx: CommandDispatchContext): boolean {
  finishCommand(ctx)
  ctx.deps.setTabPicker(
    ctx.deps.sessionId,
    mountTabPickerLoadingColumn(ctx.deps.sessionId, false, "groupNew")
  )
  ctx.deps.setModeToolbarOrder((prev) => activateModeToolbar(prev, "tabs"))
  void (async () => {
    try {
      const { rows, lastNormalWindowId } = await buildTabPickerRowsBundle(
        false,
        ctx.deps.uiSettings.locale
      )
      const initialHi = resolveInitialTabPickerHighlightIndex(rows, lastNormalWindowId)
      ctx.deps.setTabPicker(
        ctx.deps.sessionId,
        openTabPickerEngineForSession(ctx.deps.sessionId, {
          rows,
          showUrl: false,
          initialHi,
          variant: "groupNew"
        })
      )
      ctx.deps.activatePaneFocus("tabs")
      void ctx.deps.appendLogLines([`> ${ctx.trimmed}`, tGroup("group.newPicker", ctx.locale)])
    } catch (e) {
      if (ctx.deps.tabPickerRef.current?.rows.length === 0) {
        closeTabPickerEngineForSession(ctx.deps.sessionId)
        ctx.deps.setTabPicker(ctx.deps.sessionId, null)
        ctx.deps.setModeToolbarOrder((prev) => deactivateModeToolbar(prev, "tabs"))
      }
      await ctx.deps.appendLogLines([
        `> ${ctx.trimmed}`,
        tError("error.generic", ctx.locale, {
          message: e instanceof Error ? e.message : String(e)
        })
      ])
    }
  })()
  return true
}

async function applyGroupNewSegment(ctx: CommandDispatchContext): Promise<SegmentOutcome> {
  ctx.deps.setTabPicker(
    ctx.deps.sessionId,
    mountTabPickerLoadingColumn(ctx.deps.sessionId, false, "groupNew")
  )
  ctx.deps.setModeToolbarOrder((prev) => activateModeToolbar(prev, "tabs"))
  try {
    const { rows, lastNormalWindowId } = await buildTabPickerRowsBundle(
      false,
      ctx.deps.uiSettings.locale
    )
    const initialHi = resolveInitialTabPickerHighlightIndex(rows, lastNormalWindowId)
    ctx.deps.setTabPicker(
      ctx.deps.sessionId,
      openTabPickerEngineForSession(ctx.deps.sessionId, {
        rows,
        showUrl: false,
        initialHi,
        variant: "groupNew"
      })
    )
    ctx.deps.activatePaneFocus("tabs")
    return segmentSuccess([tGroup("group.newPicker", ctx.locale)])
  } catch (e) {
    if (ctx.deps.tabPickerRef.current?.rows.length === 0) {
      closeTabPickerEngineForSession(ctx.deps.sessionId)
      ctx.deps.setTabPicker(ctx.deps.sessionId, null)
      ctx.deps.setModeToolbarOrder((prev) => deactivateModeToolbar(prev, "tabs"))
    }
    const message = e instanceof Error ? e.message : String(e)
    return segmentFailure("runtime", [tError("error.generic", ctx.locale, { message })], message)
  }
}

function applyTranslateOn(ctx: CommandDispatchContext): boolean {
  finishCommand(ctx)
  ctx.deps.lineRef.current = ""
  void (async () => {
    await saveTranslateEnabled(true)
    ctx.deps.setTranslateEnabled(true)
    ctx.deps.setModeToolbarOrder((prev) => activateModeToolbar(prev, "translate"))
    await ctx.deps.appendLogLines([
      `> ${ctx.trimmed}`,
      translateOnLogLine(
        ctx.deps.uiSettings.locale,
        settingTokenForPairId(ctx.deps.translatePairIdRef.current)
      )
    ])
    ctx.deps.focusPrompt()
  })()
  return true
}

async function applyTranslateOnSegment(ctx: CommandDispatchContext): Promise<SegmentOutcome> {
  await saveTranslateEnabled(true)
  ctx.deps.setTranslateEnabled(true)
  ctx.deps.setModeToolbarOrder((prev) => activateModeToolbar(prev, "translate"))
  return segmentSuccess([
    translateOnLogLine(
      ctx.deps.uiSettings.locale,
      settingTokenForPairId(ctx.deps.translatePairIdRef.current)
    )
  ])
}

function applyTranslateOff(ctx: CommandDispatchContext): boolean {
  finishCommand(ctx)
  ctx.deps.lineRef.current = ""
  void (async () => {
    await saveTranslateEnabled(false)
    ctx.deps.setTranslateEnabled(false)
    ctx.deps.setModeToolbarOrder((prev) => deactivateModeToolbar(prev, "translate"))
    await ctx.deps.appendLogLines([`> ${ctx.trimmed}`, tTranslate("translate.off", ctx.locale)])
    ctx.deps.activatePaneFocus("terminal")
  })()
  return true
}

async function applyTranslateOffSegment(ctx: CommandDispatchContext): Promise<SegmentOutcome> {
  await saveTranslateEnabled(false)
  ctx.deps.setTranslateEnabled(false)
  ctx.deps.setModeToolbarOrder((prev) => deactivateModeToolbar(prev, "translate"))
  ctx.deps.activatePaneFocus("terminal")
  return segmentSuccess([tTranslate("translate.off", ctx.locale)])
}

function applyTranslateSetting(ctx: CommandDispatchContext, pairRaw: string): boolean {
  const pair: TranslationPairId | null =
    pairRaw === "ja-en" || pairRaw === "en-ja"
      ? pairRaw
      : pairIdFromSettingToken(pairRaw)
  if (pair === null) {
    return false
  }
  finishCommand(ctx)
  ctx.deps.lineRef.current = ""
  void (async () => {
    await saveTranslatePair(pair)
    ctx.deps.setTranslatePairId(pair)
    ctx.deps.resetNavTranslateSession()
    const token = settingTokenForPairId(pair)
    await ctx.deps.appendLogLines([
      `> ${ctx.trimmed}`,
      tTranslate("translate.pairSet", ctx.locale, { token })
    ])
    ctx.deps.focusPrompt()
  })()
  return true
}

async function applyTranslateSettingSegment(
  ctx: CommandDispatchContext,
  pairRaw: string
): Promise<SegmentOutcome> {
  const pair: TranslationPairId | null =
    pairRaw === "ja-en" || pairRaw === "en-ja"
      ? pairRaw
      : pairIdFromSettingToken(pairRaw)
  if (pair === null) {
    return segmentFailure("usage", [tError("error.generic", ctx.locale, { message: ctx.trimmed })])
  }
  await saveTranslatePair(pair)
  ctx.deps.setTranslatePairId(pair)
  ctx.deps.resetNavTranslateSession()
  const token = settingTokenForPairId(pair)
  return segmentSuccess([tTranslate("translate.pairSet", ctx.locale, { token })])
}

function resolveSnapshotParsed(ctx: CommandDispatchContext, lineFromAction: string) {
  return parseSnapshotSaveLine(ctx.trimmed) ?? parseSnapshotSaveLine(`snapshot -save ${lineFromAction}`)
}

function applySnapshotSave(ctx: CommandDispatchContext, lineFromAction: string): boolean {
  const parsed = resolveSnapshotParsed(ctx, lineFromAction)
  if (parsed === null) {
    return false
  }
  finishCommand(ctx)
  ctx.deps.setSubCmdPicker(null)
  void ctx.deps.runSnapshotSave(ctx.trimmed, parsed.tabId)
  ctx.deps.focusPrompt()
  return true
}

async function applySnapshotSaveSegment(
  ctx: CommandDispatchContext,
  lineFromAction: string
): Promise<SegmentOutcome> {
  const parsed = resolveSnapshotParsed(ctx, lineFromAction)
  if (parsed === null) {
    return segmentFailure("usage", [tError("error.generic", ctx.locale, { message: "snapshot -save" })])
  }
  ctx.deps.setSubCmdPicker(null)
  const result = await saveSnapshotFromTab(parsed.tabId, { sessionId: ctx.deps.sessionId })
  const lines = snapshotSaveLogLinesForResult(ctx.locale, result)
  if (result.ok) {
    return segmentSuccess(lines)
  }
  return segmentFailure("runtime", lines, lines[0])
}

function applyBrowse(ctx: CommandDispatchContext, line: string): boolean {
  const browseLine = line.trim().length > 0 ? `browse ${line}` : ctx.trimmed
  recordOnly(ctx)
  ctx.deps.setSubCmdPicker(null)

  void (async () => {
    const outcome = await runBrowseCommand(browseLine, ctx.deps, ctx.locale)
    if (outcome === null) {
      return
    }
    if (outcome.code === "usage") {
      await ctx.deps.appendLogLines([`> ${ctx.trimmed}`, ...outcome.stdout], "stdout")
      setContinuationPrompt(ctx.deps, "browse ")
      return
    }
    clearPrompt(ctx.deps)
    await ctx.deps.appendLogLines([`> ${ctx.trimmed}`, ...outcome.stdout], "stdout")
    if (outcome.stderr.length > 0) {
      await ctx.deps.appendLogLines(outcome.stderr, "stderr")
    }
    if (outcome.exitStatus !== 0) {
      ctx.deps.focusPrompt()
    }
  })()
  return true
}

async function applyBrowseSegment(
  ctx: CommandDispatchContext,
  line: string
): Promise<SegmentOutcome> {
  const browseLine = line.trim().length > 0 ? `browse ${line}` : ctx.trimmed
  const outcome = await runBrowseCommand(browseLine, ctx.deps, ctx.locale)
  if (outcome === null) {
    return segmentFailure("unknown", [`error: unknown command: ${ctx.trimmed}`])
  }
  return outcome
}

function applyOpenPlainList(ctx: CommandDispatchContext, line: string): boolean {
  finishCommand(ctx)
  void (async () => {
    const lines = await tryRunPlainListCommand(line, { locale: ctx.locale, deps: ctx.deps })
    await ctx.deps.appendLogLines([`> ${ctx.trimmed}`, ...(lines ?? [])])
    ctx.deps.focusPrompt()
  })()
  return true
}

function applyClosePicker(ctx: CommandDispatchContext, slot: string): boolean {
  finishCommand(ctx)
  void (async () => {
    const logLines = [`> ${ctx.trimmed}`]
    logLines.push(...closePickerLines(ctx, slot))
    await ctx.deps.appendLogLines(logLines)
    ctx.deps.focusPrompt()
  })()
  return true
}

async function applyClosePickerSegment(
  ctx: CommandDispatchContext,
  slot: string
): Promise<SegmentOutcome> {
  return segmentSuccess(closePickerLines(ctx, slot))
}

function closePickerLines(ctx: CommandDispatchContext, slot: string): string[] {
  switch (slot) {
    case "setting":
      if (ctx.deps.settingListPickerRef.current !== null) {
        ctx.deps.closeSettingPickerColumn()
        return [tSetting("setting.picker.closed", ctx.locale)]
      }
      return [tSetting("setting.picker.notOpen", ctx.locale)]
    case "tabs":
      if (ctx.deps.tabPickerRef.current !== null) {
        closeTabPickerEngineForSession(ctx.deps.sessionId)
        ctx.deps.setTabPicker(ctx.deps.sessionId, null)
        ctx.deps.setModeToolbarOrder((prev) => deactivateModeToolbar(prev, "tabs"))
        ctx.deps.activatePaneFocus("terminal")
        return [tTabs("tabs.picker.closed", ctx.locale)]
      }
      return [tTabs("tabs.picker.notOpen", ctx.locale)]
    case "search": {
      const hadActiveJob = ctx.deps.jobRunner.isActive("search-list")
      if (hadActiveJob) {
        ctx.deps.jobRunner.cancel("search-list")
      }
      ctx.deps.clearSearchLoadingProgress()
      if (ctx.deps.searchListPickerRef.current !== null) {
        ctx.deps.setSearchListPicker(ctx.deps.sessionId, null)
        ctx.deps.setModeToolbarOrder((prev) => deactivateModeToolbar(prev, "search"))
        ctx.deps.activatePaneFocus("terminal")
        return [tSearch("search.picker.closed", ctx.locale)]
      }
      if (hadActiveJob) {
        return [tSearch("search.picker.cancelled", ctx.locale)]
      }
      return [tSearch("search.picker.notOpen", ctx.locale)]
    }
    case "dom": {
      const hadActiveDomJob = ctx.deps.jobRunner.isActive("dom-list")
      if (hadActiveDomJob) {
        ctx.deps.jobRunner.cancel("dom-list")
      }
      if (ctx.deps.domListPickerRef.current !== null) {
        ctx.deps.setDomListPicker(ctx.deps.sessionId, null)
        ctx.deps.setModeToolbarOrder((prev) => deactivateModeToolbar(prev, "dom"))
        ctx.deps.activatePaneFocus("terminal")
        return [tDom("dom.picker.closed", ctx.locale)]
      }
      return [tDom("dom.picker.notOpen", ctx.locale)]
    }
    default:
      return [tError("error.generic", ctx.locale, { message: `unknown picker slot: ${slot}` })]
  }
}

function applyContinuationPrompt(ctx: CommandDispatchContext, prefix: string): boolean {
  recordOnly(ctx)
  setContinuationPrompt(ctx.deps, prefix)
  ctx.deps.setSubCmdPicker(null)
  return true
}
