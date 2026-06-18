/** BMXt prompt parsing for `session` subcommands. */

const SESSION_LIST_RE = /^\s*session\s+-list\s*$/i
const SESSION_NUMBER_RE = /^\s*session\s+(\d+)\s*$/i

/** `session -list` — full line must match. */
export function parseSessionListPickerLine(trimmed: string): boolean {
  return SESSION_LIST_RE.test(trimmed.trim())
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

/** `session -list` or `session <n>` — UI-handled switch lines (not bare `session`). */
export function isSessionSwitchUiLine(trimmed: string): boolean {
  return (
    parseSessionListPickerLine(trimmed) || parseSessionSwitchByNumberLine(trimmed) !== null
  )
}
