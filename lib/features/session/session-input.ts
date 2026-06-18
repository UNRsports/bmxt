/** BMXt prompt parsing for `session` subcommands. */

const SESSION_LIST_RE = /^\s*session\s+-list\s*$/i
const SESSION_NUMBER_RE = /^\s*session\s+(\d+)\s*$/i
const SESSION_SETTING_NAME_BARE_RE = /^\s*session\s+-setting-name\s*$/i
const SESSION_SETTING_NAME_WITH_RE = /^\s*session\s+-setting-name\s+(.+)$/i

/** `session -list` — full line must match. */
export function parseSessionListPickerLine(trimmed: string): boolean {
  return SESSION_LIST_RE.test(trimmed.trim())
}

/** `session -setting-name` with no name — open inline rename on the prompt. */
export function parseSessionSettingNameBareLine(trimmed: string): boolean {
  return SESSION_SETTING_NAME_BARE_RE.test(trimmed.trim())
}

/** `session -setting-name <name>` — optional one-line rename; returns trimmed name or null. */
export function parseSessionSettingNameWithLine(trimmed: string): string | null {
  const m = trimmed.trim().match(SESSION_SETTING_NAME_WITH_RE)
  if (!m) {
    return null
  }
  const name = m[1]!.trim()
  return name.length > 0 ? name : null
}

/** UI-handled `session -setting-name` lines (bare or with name). */
export function isSessionSettingNameUiLine(trimmed: string): boolean {
  return parseSessionSettingNameBareLine(trimmed) || parseSessionSettingNameWithLine(trimmed) !== null
}

/** `session <n>` — 1-based session index (full line must match). */
export function parseSessionSwitchByNumberLine(trimmed: string): number | null {
  const m = trimmed.trim().match(SESSION_NUMBER_RE)
  if (!m) {
    return null
  }
  const n = Number.parseInt(m[1] ?? "", 10)
  if (!Number.isInteger(n) || n < 1) {
    return null
  }
  return n
}

/** `session <n>` — UI-handled direct switch (not `session -list`; that uses inline candidates). */
export function isSessionSwitchUiLine(trimmed: string): boolean {
  return parseSessionSwitchByNumberLine(trimmed) !== null
}
