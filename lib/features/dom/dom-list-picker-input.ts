/**
 * EN: Prompt parsing / Tab zone for `dom -list` (find-list と同型の picker 起動フロー).
 * JA: `dom -list` のプロンプト解析・Tab 補完（`find -list` と同型の段取り）。
 */

import { optionTokenZoneAfterLead } from "../command-line/option-token-zone"
import type { DomTreeEntry } from "./dom-list-capture.ts"
import type { DomListFlavor, DomPickerMode } from "./dom-picker-mode"
import {
  isDomListAwaitingOptionsOrPattern,
  listDomListRemainingOptionCandidates
} from "./dom-list-picker-parse.ts"
import { parseDomListPickerLine as parseDomListPickerOptions } from "./dom-list-parse.ts"
import { parseDomListCommandLine } from "./parse-dom-list-args.ts"
export { isDomListPermissionPromptOutput as isRetryableDomListOutput } from "./dom-list-prompt-eligibility"

/** After `dom -list ` — optional mode / flavor tokens */
const DOM_LIST_LEAD_RE = /^\s*dom\s+-list\s+/i

const DOM_EXIT_LIST_RE = /^\s*dom\s+-exit\s+-list\s*$/i

/** `dom -exit -list` — close DOM list picker in this pane (full line must match). */
export function parseDomExitListLine(trimmed: string): boolean {
  return DOM_EXIT_LIST_RE.test(trimmed.trim())
}

/**
 * EN: Enter opens dom -list picker when `--picker` is present.
 * JA: `--picker` 指定時のみ picker を起動する。
 */
export function parseDomListPickerLine(trimmed: string): string | null {
  const parsed = parseDomListPickerOptions(trimmed)
  if (parsed === null) {
    return null
  }
  return trimmed.trim()
}

/** EN: Bare `dom -list` without `--picker` runs plain output (default `--html`). */
export function isDomListAwaitingFlavor(_trimmed: string): boolean {
  return false
}

export { isDomListAwaitingOptionsOrPattern } from "./dom-list-picker-parse.ts"

export function domListFlavorCompletionZone(
  line: string,
  cursor: number
): { optionStart: number; prefix: string; optionEnd: number } | null {
  return optionTokenZoneAfterLead(line, cursor, DOM_LIST_LEAD_RE)
}

export function listDomListFlavorCandidates(prefix: string, line?: string): string[] {
  const tokensAfterList =
    line === undefined
      ? []
      : line
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .slice(2)
  return listDomListRemainingOptionCandidates(tokensAfterList, prefix)
}

/**
 * EN: Picker state — DOM lines, or an optional-host permission prompt when http(s) access
 *     was denied and the user can grant it from the picker.
 * JA: ピッカー状態 — DOM 行、または http(s) オプション権限が拒否されたときの許可プロンプト。
 */
export type DomListPickerState =
  | {
      kind: "lines"
      lines: string[]
      commandLine: string
      targetTabId?: number
      jumpPaths?: (readonly number[] | null)[]
      headerLineCount?: number
      pickerMode?: DomPickerMode
      flavor?: DomListFlavor
      showTag?: boolean
      pattern?: string
      documentEntries?: readonly DomTreeEntry[]
      documentTruncated?: boolean
    }
  | { kind: "prompt"; message: string[]; commandLine: string }

export { parseDomListCommandLine }
