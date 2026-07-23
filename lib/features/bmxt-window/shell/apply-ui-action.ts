import { buildHelpLines } from "../../bmxt-core/registry/help"
import {
  fetchListResultById,
  runPlainListForCommandId,
  type ListCommandFetchContext,
  type ListCommandId
} from "../../command-line/list-commands"
import { segmentFailure, segmentSuccess } from "../../command-line/compound/classify-outcome"
import type { SegmentOutcome } from "../../command-line/compound/types"
import {
  saveDomPageActiveMode,
  settingTokenForDomPageActiveMode
} from "../../dom/page-active-setting"
import { parseDomListLine } from "../../dom/dom-list-parse"
import { canScriptHttpHostPages } from "../../extension-permissions/optional-http-hosts"
import { openPickerFromListResult } from "../../picker/open-from-list-result"
import { saveSnapshotFromTab } from "../../snapshot/snapshot-save-tab"
import { snapshotSaveLogLinesForResult } from "../../snapshot/snapshot-save-log-lines"
import { resolveSessionRowByDisplayName } from "../../session"
import { parseSnapshotSaveLine } from "../../snapshot/snapshot-save-input"
import { parseSearchListLine } from "../../search/search-list-parse"
import { tDom } from "../../setting/i18n/ns/dom"
import { tCmd } from "../../setting/i18n/ns/cmd"
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
import { beginNavConfirmClose } from "./command-dispatch/handle-nav-confirm-close"
import {
  clearPrompt,
  recordCommandHistory,
  setContinuationPrompt,
  type CommandDispatchContext
} from "./command-dispatch/types"
import { parseNavConfirmCloseTarget } from "../../nav/nav-confirm-close"

function finishCommand(ctx: CommandDispatchContext): void {
  ctx.deps.appendCommandToHistory(ctx.trimmed)
  clearPrompt(ctx.deps)
  recordCommandHistory(ctx.deps)
}

function recordOnly(ctx: CommandDispatchContext): void {
  ctx.deps.appendCommandToHistory(ctx.trimmed)
  recordCommandHistory(ctx.deps)
}

function listFetchContext(ctx: CommandDispatchContext): ListCommandFetchContext {
  return { locale: ctx.locale, deps: ctx.deps }
}

function parseListCommandId(raw: string): ListCommandId | null {
  if (
    raw === "tabs" ||
    raw === "dom" ||
    raw === "search" ||
    raw === "session" ||
    raw === "setting"
  ) {
    return raw
  }
  return null
}

function resolveListLine(ctx: CommandDispatchContext, lineFromAction: string): string {
  if (lineFromAction.trim().length > 0) {
    return lineFromAction
  }
  return ctx.trimmed
}

type ListMatchResult =
  | { ok: true; match: unknown }
  | { ok: false; errorLine: string }

function buildPlainListMatch(listId: ListCommandId, line: string): ListMatchResult {
  switch (listId) {
    case "session":
    case "setting":
      return { ok: true, match: {} }
    case "tabs":
      return { ok: true, match: { showUrl: false } }
    case "dom": {
      const parsed = parseDomListLine(line)
      if (parsed === null) {
        return { ok: false, errorLine: line }
      }
      return {
        ok: true,
        match: {
          flavor: parsed.flavor,
          pickerMode: parsed.pickerMode,
          showTag: parsed.showTag,
          pattern: parsed.pattern
        }
      }
    }
    case "search": {
      const parsed = parseSearchListLine(line)
      if (parsed === null) {
        return { ok: false, errorLine: line }
      }
      return { ok: true, match: { dispatchLine: parsed.dispatchLine } }
    }
    default: {
      const _exhaustive: never = listId
      return { ok: false, errorLine: String(_exhaustive) }
    }
  }
}

function buildPickerListMatch(
  listId: ListCommandId,
  line: string,
  showUrlRaw: string
): ListMatchResult {
  switch (listId) {
    case "session":
    case "setting":
      return { ok: true, match: {} }
    case "tabs":
      return { ok: true, match: { showUrl: showUrlRaw === "true" } }
    case "dom": {
      const parsed = parseDomListLine(line)
      if (parsed === null) {
        return { ok: false, errorLine: line }
      }
      return {
        ok: true,
        match: {
          flavor: parsed.flavor,
          pickerMode: parsed.pickerMode,
          showTag: parsed.showTag,
          pattern: parsed.pattern
        }
      }
    }
    case "search": {
      const parsed = parseSearchListLine(line)
      if (parsed === null) {
        return { ok: false, errorLine: line }
      }
      return { ok: true, match: { dispatchLine: parsed.dispatchLine } }
    }
    default: {
      const _exhaustive: never = listId
      return { ok: false, errorLine: String(_exhaustive) }
    }
  }
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
    case "nav_confirm_close":
      return applyNavConfirmClose(ctx, action.target)
    case "open_plain_list":
      return applyOpenPlainList(ctx, action.list_id, action.line)
    case "open_picker":
      return applyOpenPicker(ctx, action.list_id, action.line, action.show_url)
    case "close_picker":
      return applyClosePicker(ctx, action.slot)
    case "continuation_prompt":
      return applyContinuationPrompt(ctx, action.prefix)
    case "session_switch":
      return applySessionSwitch(ctx, action.name)
    case "session_setting_name":
      return applySessionSettingName(ctx, action.name)
    case "group_new_from_selection":
      return applyGroupNewFromSelection(ctx)
    case "set_mode":
      return applySetMode(ctx, action.feature_id, action.mode)
    case "snapshot_save":
      return applySnapshotSave(ctx, action.line)
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
    case "nav_confirm_close":
      return segmentFailure("interactive", [tCmd("cmd.nav.confirm.compoundBlocked", ctx.locale)])
    case "open_plain_list":
      return applyOpenPlainListSegment(ctx, action.list_id, action.line)
    case "open_picker":
      return applyOpenPickerSegment(ctx, action.list_id, action.line, action.show_url)
    case "close_picker":
      return applyClosePickerSegment(ctx, action.slot)
    case "continuation_prompt":
      return segmentFailure("continuation", [`continuation required: ${ctx.trimmed}`])
    case "session_switch":
      return applySessionSwitchSegment(ctx, action.name)
    case "session_setting_name":
      return applySessionSettingNameSegment(ctx, action.name)
    case "group_new_from_selection":
      return applyGroupNewSegment(ctx)
    case "set_mode":
      return applySetModeSegment(ctx, action.feature_id, action.mode)
    case "snapshot_save":
      return applySnapshotSaveSegment(ctx, action.line)
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

function applyNavConfirmClose(ctx: CommandDispatchContext, targetRaw: string): boolean {
  const target = parseNavConfirmCloseTarget(targetRaw)
  if (!target) {
    return false
  }
  beginNavConfirmClose(ctx, target)
  return true
}

function applySetMode(ctx: CommandDispatchContext, featureId: string, modeRaw: string): boolean {
  switch (featureId) {
    case "tabs":
      return applyTabsSetting(ctx, modeRaw)
    case "dom":
      return applyDomSetting(ctx, modeRaw)
    case "translate":
      if (modeRaw === "on") {
        return applyTranslateOn(ctx)
      }
      if (modeRaw === "off") {
        return applyTranslateOff(ctx)
      }
      if (modeRaw === "ja-en" || modeRaw === "en-ja") {
        return applyTranslateSetting(ctx, modeRaw)
      }
      return false
    default:
      return false
  }
}

async function applySetModeSegment(
  ctx: CommandDispatchContext,
  featureId: string,
  modeRaw: string
): Promise<SegmentOutcome> {
  switch (featureId) {
    case "tabs":
      return applyTabsSettingSegment(ctx, modeRaw)
    case "dom":
      return applyDomSettingSegment(ctx, modeRaw)
    case "translate":
      if (modeRaw === "on") {
        return applyTranslateOnSegment(ctx)
      }
      if (modeRaw === "off") {
        return applyTranslateOffSegment(ctx)
      }
      if (modeRaw === "ja-en" || modeRaw === "en-ja") {
        return applyTranslateSettingSegment(ctx, modeRaw)
      }
      return segmentFailure("usage", [tError("error.generic", ctx.locale, { message: ctx.trimmed })])
    default:
      return segmentFailure("usage", [tError("error.generic", ctx.locale, { message: ctx.trimmed })])
  }
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

function applyOpenPlainList(
  ctx: CommandDispatchContext,
  listIdRaw: string,
  lineFromAction: string
): boolean {
  const listId = parseListCommandId(listIdRaw)
  if (listId === null) {
    return false
  }
  const line = resolveListLine(ctx, lineFromAction)
  const matchResult = buildPlainListMatch(listId, line)
  if (matchResult.ok === false) {
    return false
  }
  finishCommand(ctx)
  void (async () => {
    try {
      const lines = await runPlainListForCommandId(
        listId,
        matchResult.match,
        listFetchContext(ctx)
      )
      await ctx.deps.appendLogLines([`> ${ctx.trimmed}`, ...lines])
    } catch (e) {
      await ctx.deps.appendLogLines([
        `> ${ctx.trimmed}`,
        tError("error.generic", ctx.locale, {
          message: e instanceof Error ? e.message : String(e)
        })
      ])
    }
    ctx.deps.focusPrompt()
  })()
  return true
}

async function applyOpenPlainListSegment(
  ctx: CommandDispatchContext,
  listIdRaw: string,
  lineFromAction: string
): Promise<SegmentOutcome> {
  const listId = parseListCommandId(listIdRaw)
  if (listId === null) {
    return segmentFailure("unknown", [`error: unknown list: ${listIdRaw}`])
  }
  const line = resolveListLine(ctx, lineFromAction)
  const matchResult = buildPlainListMatch(listId, line)
  if (matchResult.ok === false) {
    return segmentFailure("usage", [tError("error.generic", ctx.locale, { message: line })])
  }
  try {
    const lines = await runPlainListForCommandId(
      listId,
      matchResult.match,
      listFetchContext(ctx)
    )
    return segmentSuccess(lines)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return segmentFailure("runtime", [tError("error.generic", ctx.locale, { message })], message)
  }
}

function applyOpenPicker(
  ctx: CommandDispatchContext,
  listIdRaw: string,
  lineFromAction: string,
  showUrlRaw: string
): boolean {
  const listId = parseListCommandId(listIdRaw)
  if (listId === null) {
    return false
  }
  const line = resolveListLine(ctx, lineFromAction)
  const matchResult = buildPickerListMatch(listId, line, showUrlRaw)
  if (matchResult.ok === false) {
    return false
  }
  recordOnly(ctx)
  ctx.deps.setSubCmdPicker(null)
  void (async () => {
    try {
      const listResult = await fetchListResultById(
        listId,
        matchResult.match,
        listFetchContext(ctx)
      )
      const showUrl = listId === "tabs" ? showUrlRaw === "true" : false
      const outcome = await openPickerFromListResult(
        listResult,
        { showUrl },
        ctx.deps,
        ctx.locale
      )
      clearPrompt(ctx.deps)
      await ctx.deps.appendLogLines([`> ${ctx.trimmed}`, ...outcome.stdout], "stdout")
      if (outcome.stderr.length > 0) {
        await ctx.deps.appendLogLines(outcome.stderr, "stderr")
      }
      if (outcome.exitStatus !== 0) {
        ctx.deps.focusPrompt()
      }
    } catch (e) {
      await ctx.deps.appendLogLines([
        `> ${ctx.trimmed}`,
        tError("error.generic", ctx.locale, {
          message: e instanceof Error ? e.message : String(e)
        })
      ])
      ctx.deps.focusPrompt()
    }
  })()
  return true
}

async function applyOpenPickerSegment(
  ctx: CommandDispatchContext,
  listIdRaw: string,
  lineFromAction: string,
  showUrlRaw: string
): Promise<SegmentOutcome> {
  const listId = parseListCommandId(listIdRaw)
  if (listId === null) {
    return segmentFailure("unknown", [`error: unknown list: ${listIdRaw}`])
  }
  const line = resolveListLine(ctx, lineFromAction)
  const matchResult = buildPickerListMatch(listId, line, showUrlRaw)
  if (matchResult.ok === false) {
    return segmentFailure("usage", [tError("error.generic", ctx.locale, { message: line })])
  }
  try {
    const listResult = await fetchListResultById(
      listId,
      matchResult.match,
      listFetchContext(ctx)
    )
    const showUrl = listId === "tabs" ? showUrlRaw === "true" : false
    return openPickerFromListResult(listResult, { showUrl }, ctx.deps, ctx.locale)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return segmentFailure("runtime", [tError("error.generic", ctx.locale, { message })], message)
  }
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
