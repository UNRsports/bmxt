import type { ChromeEffect } from "../../dispatch/effect-types"
import { parseDomExitListLine } from "../../dom/dom-list-picker-input"
import { parseNavEnterLine, parseNavExitLine } from "../../nav"
import { parseSearchExitListLine } from "../../search/search-list-picker-input"
import { parseSettingExitListLine } from "../../setting/setting-list-picker-input"
import {
  buildSessionSwitchCommandLine,
  isSessionSettingNameUiLine,
  isSessionSwitchUiLine,
  parseSessionSwitchWithLine,
  resolveSessionRowByDisplayName,
  resolveSessionSwitchPickerState,
  sessionSwitchCommandName,
  type SessionListRow
} from "../../session"
import { parseTabsExitListLine } from "../../tabs/input"
import { continuationPromptAfterLoneFirstToken } from "../../builtin-commands/command-subcommands.gen"
import type { ImeTokenTier } from "../../command-line/ime-token-picker"

/** EN: Keep session switch picker open while the user is still editing the name. */
export function shouldKeepSessionSwitchPickerOpen(
  line: string,
  cursor: number,
  rows: readonly SessionListRow[]
): boolean {
  const state = resolveSessionSwitchPickerState(line, cursor)
  if (state === null) {
    return false
  }
  const trimmed = line.trim()
  const name = parseSessionSwitchWithLine(trimmed)
  if (name === null) {
    return true
  }
  const row = resolveSessionRowByDisplayName(rows, name)
  if (!row) {
    return true
  }
  const canonicalName = sessionSwitchCommandName(row, rows)
  const canonical = buildSessionSwitchCommandLine(row, rows)
  if (trimmed !== canonical) {
    return true
  }
  return state.namePrefix !== canonicalName
}

/** EN: True when dispatch effects include a page search. */
export function effectsIncludeSearchPage(effects: ChromeEffect[]): boolean {
  return effects.some((e) => e.kind === "search_page")
}

/**
 * EN: Auto-submit on Enter while the IME picker is still open and the line is already
 *     complete (typed manually). Picking a candidate never auto-submits — confirm with Enter again.
 * JA: IME ピッカー表示中に Enter したとき、行が既に完成形なら即実行。候補選択後の自動実行はしない。
 */
export function shouldAutoSubmitAfterTokenPick(trimmed: string): boolean {
  return (
    parseNavEnterLine(trimmed) ||
    parseNavExitLine(trimmed) ||
    isSessionSwitchUiLine(trimmed) ||
    isSessionSettingNameUiLine(trimmed) ||
    parseTabsExitListLine(trimmed) ||
    parseSettingExitListLine(trimmed) ||
    parseSearchExitListLine(trimmed) ||
    parseDomExitListLine(trimmed)
  )
}

/**
 * EN: Lone first token (e.g. `tabs`) + Enter in the first-tier picker → run submitLine
 *     (usage / continuation to `tabs `), not re-insert the same token.
 */
export function shouldSubmitLoneFirstTokenFromPicker(
  segmentTrimmed: string,
  tier: ImeTokenTier,
  pickedToken: string | undefined
): boolean {
  if (tier !== "first") {
    return false
  }
  if (continuationPromptAfterLoneFirstToken(segmentTrimmed) === null) {
    return false
  }
  if (!pickedToken) {
    return false
  }
  return segmentTrimmed.toLowerCase() === pickedToken.toLowerCase()
}

/** EN: Position floating picker host beside a prompt cell using layout APIs only. */
export function measureFloatingPickerHostPosition(
  cell: HTMLElement | null,
  host: HTMLElement | null
): { left: number; top: number } | null {
  if (!cell) {
    return null
  }
  const cr = cell.getBoundingClientRect()
  const gap = 2
  const hostW = host?.offsetWidth ?? 260
  const hostH = host?.offsetHeight ?? 140
  let left = cr.right + gap
  const maxLeft = window.innerWidth - hostW - 8
  if (left > maxLeft) {
    left = Math.max(8, maxLeft)
  } else {
    left = Math.max(8, left)
  }
  let top = cr.bottom + gap
  if (top + hostH > window.innerHeight - 8 && cr.top - gap - hostH >= 8) {
    top = cr.top - gap - hostH
  }
  if (top + hostH > window.innerHeight - 8) {
    top = Math.max(8, window.innerHeight - hostH - 8)
  } else {
    top = Math.max(8, top)
  }
  return { left, top }
}
