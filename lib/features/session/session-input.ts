/** BMXt prompt parsing for `session` subcommands. */

const SESSION_LIST_RE = /^\s*session\s+-list\s*$/i

/** `session -list` — full line must match. */
export function parseSessionListPickerLine(trimmed: string): boolean {
  return SESSION_LIST_RE.test(trimmed.trim())
}
