import type { ChromeEffect } from "../../dispatch/effect-types"
import {
  buildSessionSwitchCommandLine,
  parseSessionSwitchWithLine,
  resolveSessionRowByDisplayName,
  resolveSessionSwitchPickerState,
  sessionSwitchCommandName,
  type SessionListRow
} from "../../session"
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
 * EN: Lone first token (e.g. `tab`) + Enter in the first-tier picker → run submitLine
 *     (usage / continuation to `tab `), not re-insert the same token.
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

export type FloatingPickerHostLayout = {
  left: number
  top: number
  /** EN: Explicit size when filling the remaining viewport (IME help pane). */
  width?: number
  height?: number
}

export type MeasureFloatingPickerHostOptions = {
  /**
   * EN: Size the host to the remaining viewport (near caret when possible) so the
   *     Mozc-style help pane can use nearly the whole window.
   */
  fillRemainingViewport?: boolean
}

/** EN: Position floating picker host beside a prompt cell using layout APIs only. */
export function measureFloatingPickerHostPosition(
  cell: HTMLElement | null,
  host: HTMLElement | null,
  opts?: MeasureFloatingPickerHostOptions
): FloatingPickerHostLayout | null {
  if (!cell) {
    return null
  }
  const cr = cell.getBoundingClientRect()
  const gap = 2
  const margin = 8

  if (opts?.fillRemainingViewport === true) {
    let left = cr.right + gap
    let top = cr.bottom + gap
    // EN: Prefer opening below/right of the caret; if too little room, pin to window insets.
    if (left > window.innerWidth - 280) {
      left = margin
    } else {
      left = Math.max(margin, left)
    }
    if (top > window.innerHeight - 160) {
      top = margin
    } else {
      top = Math.max(margin, top)
    }
    const width = Math.max(280, window.innerWidth - left - margin)
    const height = Math.max(160, window.innerHeight - top - margin)
    return { left, top, width, height }
  }

  const hostW = host?.offsetWidth ?? 260
  const hostH = host?.offsetHeight ?? 140
  let left = cr.right + gap
  const maxLeft = window.innerWidth - hostW - margin
  if (left > maxLeft) {
    left = Math.max(margin, maxLeft)
  } else {
    left = Math.max(margin, left)
  }
  let top = cr.bottom + gap
  if (top + hostH > window.innerHeight - margin && cr.top - gap - hostH >= margin) {
    top = cr.top - gap - hostH
  }
  if (top + hostH > window.innerHeight - margin) {
    top = Math.max(margin, window.innerHeight - hostH - margin)
  } else {
    top = Math.max(margin, top)
  }
  return { left, top }
}
