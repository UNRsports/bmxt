/** EN: Prompt parsing for `setting -list` / `setting -exit -list`. */

const SETTING_INCOMPLETE_RE = /^\s*setting\s*$/i
const SETTING_LIST_RE = /^\s*setting\s+-list\s*$/i
const SETTING_EXIT_LIST_RE = /^\s*setting\s+-exit\s+-list\s*$/i

/** EN: Lone `setting` — continuation to `setting `. */
export function parseSettingIncompleteLine(trimmed: string): boolean {
  return SETTING_INCOMPLETE_RE.test(trimmed.trim())
}

/** EN: `setting -list` — open settings picker (full line must match). */
export function parseSettingListPickerLine(trimmed: string): boolean {
  return SETTING_LIST_RE.test(trimmed.trim())
}

/** EN: `setting -exit -list` — close settings picker in this pane. */
export function parseSettingExitListLine(trimmed: string): boolean {
  return SETTING_EXIT_LIST_RE.test(trimmed.trim())
}
