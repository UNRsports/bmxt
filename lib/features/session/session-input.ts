/** BMXt prompt parsing for `session` subcommands. */

const SESSION_LIST_RE = /^\s*session\s+-list\s*$/i
const SESSION_SWITCH_BARE_RE = /^\s*session\s+-switch\s*$/i
const SESSION_SWITCH_WITH_RE = /^\s*session\s+-switch\s+(.+)$/i
const SESSION_NUMBER_RE = /^\s*session\s+(\d+)\s*$/i
const SESSION_SETTING_NAME_BARE_RE = /^\s*session\s+-setting-name\s*$/i
const SESSION_SETTING_NAME_WITH_RE = /^\s*session\s+-setting-name\s+(.+)$/i

/** `session -list` — full line must match. */
export function parseSessionListPickerLine(trimmed: string): boolean {
  return SESSION_LIST_RE.test(trimmed.trim())
}

/** `session -switch` with no name — open name-based switch menu on the prompt line. */
export function parseSessionSwitchPickerLine(trimmed: string): boolean {
  return SESSION_SWITCH_BARE_RE.test(trimmed.trim())
}

/**
 * EN: `session -switch` picker UI — bare or partial/full name while the menu stays open.
 * `namePrefix` is the typed filter from the name slot through `cursor` (supports spaces in names).
 */
export function resolveSessionSwitchPickerState(
  line: string,
  cursor: number
): { namePrefix: string } | null {
  const headRe = /^(\s*session\s+-switch)(\s*)/i
  const hm = line.match(headRe)
  if (!hm) {
    return null
  }
  const switchTokenEnd = hm[1]!.length
  if (cursor < switchTokenEnd) {
    return null
  }
  let nameStart = hm[0]!.length
  while (nameStart < cursor && line[nameStart] === " ") {
    nameStart++
  }
  return { namePrefix: line.slice(nameStart, cursor) }
}

/** `session -switch <name>` — direct switch by display name; returns trimmed name or null. */
export function parseSessionSwitchWithLine(trimmed: string): string | null {
  const m = trimmed.trim().match(SESSION_SWITCH_WITH_RE)
  if (!m) {
    return null
  }
  const name = m[1]!.trim()
  return name.length > 0 ? name : null
}

/** UI-handled `session -switch` lines (bare or with name). */
export function isSessionSwitchByNameUiLine(trimmed: string): boolean {
  return parseSessionSwitchPickerLine(trimmed) || parseSessionSwitchWithLine(trimmed) !== null
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
