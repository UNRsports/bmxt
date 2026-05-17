/**
 * EN: Prompt parsing / Tab zone for `dom -list` (find-list と同型の picker 起動フロー).
 * JA: `dom -list` のプロンプト解析・Tab 補完（`find -list` と同型の段取り）。
 */

import { listThirdTokenCandidates } from "../builtin-commands/command-subcommands.gen"
import { optionTokenZoneAfterLead } from "../command-line/option-token-zone"
export { isDomListPermissionPromptOutput as isRetryableDomListOutput } from "./dom-list-prompt-eligibility"

/** After `dom -list ` — optional flavor token `--html` | `--react` */
const DOM_LIST_LEAD_RE = /^\s*dom\s+-list\s+/i

const DOM_EXIT_LIST_RE = /^\s*dom\s+-exit\s+-list\s*$/i

/** `dom -exit -list` — close DOM list picker in this pane (full line must match). */
export function parseDomExitListLine(trimmed: string): boolean {
  return DOM_EXIT_LIST_RE.test(trimmed.trim())
}

/**
 * EN: Enter opens dom -list picker when the line specifies the flavor as a third token
 *     (`dom -list --html …` / `dom -list --react …`). With only `dom -list` typed, the shell
 *     instead opens the third-token pull-down (same UI as the second-command picker) so the
 *     user can pick `--html` or `--react` first.
 * JA: 第三トークン（`--html` / `--react`）込みのときだけ picker を起動する。`dom -list` のみで
 *     Enter したときは shell 側で第三トークンプルダウン（第二コマンドピッカーと同じ UI）を出す。
 */
export function parseDomListPickerLine(trimmed: string): string | null {
  const t = trimmed.trim()
  const parts = t.split(/\s+/).filter((s) => s.length > 0)
  if (parts.length < 3) {
    return null
  }
  if (parts[0]!.toLowerCase() !== "dom") {
    return null
  }
  if (parts[1]!.toLowerCase() !== "-list") {
    return null
  }
  const flavor = parts[2]!.toLowerCase()
  if (flavor !== "--html" && flavor !== "--react") {
    return null
  }
  return t
}

/**
 * EN: True when the line is exactly `dom -list` (no third token) — shell should open the
 *     flavor pull-down rather than running picker dispatch yet.
 * JA: `dom -list` のみ（第三トークン無し）かを判定。true のとき shell は flavor プルダウンを開く。
 */
export function isDomListAwaitingFlavor(trimmed: string): boolean {
  const t = trimmed.trim()
  const parts = t.split(/\s+/).filter((s) => s.length > 0)
  if (parts.length !== 2) {
    return false
  }
  if (parts[0]!.toLowerCase() !== "dom") {
    return false
  }
  if (parts[1]!.toLowerCase() !== "-list") {
    return false
  }
  return true
}

export function domListFlavorCompletionZone(
  line: string,
  cursor: number
): { optionStart: number; prefix: string; optionEnd: number } | null {
  return optionTokenZoneAfterLead(line, cursor, DOM_LIST_LEAD_RE)
}

export function listDomListFlavorCandidates(prefix: string): string[] {
  return listThirdTokenCandidates("dom", "-list", prefix)
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
    }
  | { kind: "prompt"; message: string[]; commandLine: string }

