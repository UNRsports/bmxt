/**
 * EN: Prompt parsing / Tab zone for `dom -list`.
 * JA: `dom -list` のプロンプト解析・Tab 補完。
 */

import { optionTokenZoneAfterLead } from "../command-line/option-token-zone"
import type { DomTreeEntry } from "./dom-list-capture.ts"
import type { DomListFlavor, DomPickerMode } from "./dom-picker-mode"
import {
  isDomListAwaitingOptionsOrPattern,
  listDomListRemainingOptionCandidates
} from "./dom-list-picker-parse.ts"
import { parseDomListCommandLine } from "./parse-dom-list-args.ts"
export { isDomListPermissionPromptOutput as isRetryableDomListOutput } from "./dom-list-prompt-eligibility"

/** After `dom -list ` — optional mode / flavor tokens */
const DOM_LIST_LEAD_RE = /^\s*dom\s+-list\s+/i

const DOM_EXIT_LIST_RE = /^\s*dom\s+-exit\s+-list\s*$/i

/** `dom -exit -list` — close DOM list picker in this pane (full line must match). */
export function parseDomExitListLine(trimmed: string): boolean {
  return DOM_EXIT_LIST_RE.test(trimmed.trim())
}

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
 * EN: Picker state — DOM lines, or a site-access notice when http(s) access is off
 *     (user re-enables under chrome://extensions, then retries from the picker).
 * JA: ピッカー状態 — DOM 行、または http(s) サイトアクセス Off 時の案内（再有効化後に再試行）。
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
