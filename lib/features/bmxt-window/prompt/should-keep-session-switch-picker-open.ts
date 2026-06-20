import {
  buildSessionSwitchCommandLine,
  parseSessionSwitchWithLine,
  resolveSessionRowByDisplayName,
  resolveSessionSwitchPickerState,
  sessionSwitchCommandName,
  type SessionListRow
} from "../../session"

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
