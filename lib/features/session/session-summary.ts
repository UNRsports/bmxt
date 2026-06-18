import type { SessionPickerState } from "../side-picker/session/session-pickers"

export const MAX_SESSION_NAME_LEN = 64

const SESSION_CMD_LOG_RE = /^\s*>\s*session\b/i

/** EN: Trim and validate user-supplied session name; returns null if empty or invalid. */
export function sanitizeSessionName(raw: string): string | null {
  const trimmed = raw.trim()
  if (trimmed.length === 0) {
    return null
  }
  if (trimmed.length > MAX_SESSION_NAME_LEN) {
    return null
  }
  if (/[\r\n\t\u0000-\u001f\u007f]/.test(trimmed)) {
    return null
  }
  return trimmed
}

export type SessionListRow = {
  sessionId: string
  index: number
  isActive: boolean
  summary: string
  displayName: string
}

function appendPart(parts: string[], label: string, detail?: string): void {
  if (detail !== undefined && detail.length > 0) {
    parts.push(`${label}:${detail}`)
  } else {
    parts.push(label)
  }
}

export function formatSessionListCandidateLabel(row: SessionListRow): string {
  const mark = row.isActive ? "*" : " "
  return `${mark}${row.index}  ${row.displayName}`
}

export function buildSessionSummary(
  pickers: SessionPickerState | undefined,
  navArmed: boolean
): string {
  const parts: string[] = []
  if (pickers?.tabs) {
    const tabDetail =
      pickers.tabs.interactive?.hlSearchPattern &&
      pickers.tabs.interactive.hlSearchPattern.length > 0
        ? pickers.tabs.interactive.hlSearchPattern
        : undefined
    appendPart(parts, "tabs", tabDetail)
  }
  if (pickers?.search) {
    appendPart(parts, "search", pickers.search.pattern)
  }
  if (pickers?.dom) {
    const domDetail =
      pickers.dom.kind === "lines"
        ? pickers.dom.commandLine.replace(/^\s*dom\s+-list\s*/i, "").trim() || undefined
        : pickers.dom.commandLine.replace(/^\s*dom\s+-list\s*/i, "").trim() || "prompt"
    appendPart(parts, "dom", domDetail)
  }
  if (pickers?.setting) {
    parts.push("setting")
  }
  if (navArmed) {
    parts.push("nav")
  }
  if (parts.length === 0) {
    return "(terminal only)"
  }
  return parts.join("  ")
}

/** EN: Last `> …` command line in session log, skipping session switch/create lines. */
export function lastCommandFromSessionLog(lines: readonly string[]): string | null {
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const ln = lines[i]
    if (typeof ln !== "string") {
      continue
    }
    const m = ln.match(/^\s*>\s*(.+)\s*$/)
    if (!m) {
      continue
    }
    const cmd = m[1]!.trim()
    if (cmd.length === 0 || SESSION_CMD_LOG_RE.test(ln)) {
      continue
    }
    return cmd.length > MAX_SESSION_NAME_LEN ? cmd.slice(0, MAX_SESSION_NAME_LEN) : cmd
  }
  return null
}

export function deriveDefaultSessionName(input: {
  pickers: SessionPickerState | undefined
  navArmed: boolean
  logs: readonly string[]
  fallbackIndex: number
}): string {
  const summary = buildSessionSummary(input.pickers, input.navArmed)
  if (summary !== "(terminal only)") {
    return summary.length > MAX_SESSION_NAME_LEN ? summary.slice(0, MAX_SESSION_NAME_LEN) : summary
  }
  const lastCmd = lastCommandFromSessionLog(input.logs)
  if (lastCmd) {
    return lastCmd
  }
  return `session ${input.fallbackIndex}`
}

export function resolveSessionDisplayName(input: {
  sessionId: string
  index: number
  namesById: Record<string, string | undefined>
  pickers: SessionPickerState | undefined
  navArmed: boolean
  logs: readonly string[]
}): string {
  const stored = input.namesById[input.sessionId]?.trim()
  if (stored && stored.length > 0) {
    return stored
  }
  return deriveDefaultSessionName({
    pickers: input.pickers,
    navArmed: input.navArmed,
    logs: input.logs,
    fallbackIndex: input.index
  })
}

export function buildSessionListRows(input: {
  order: readonly string[]
  activeId: string
  namesById: Record<string, string | undefined>
  logsById: Record<string, string[] | undefined>
  pickersBySession: Record<string, SessionPickerState | undefined>
  navArmedByLeaf: Record<string, boolean>
}): SessionListRow[] {
  return input.order.map((sessionId, i) => {
    const index = i + 1
    const pickers = input.pickersBySession[sessionId]
    const navArmed = input.navArmedByLeaf[sessionId] ?? false
    const logs = input.logsById[sessionId] ?? []
    const summary = buildSessionSummary(pickers, navArmed)
    const displayName = resolveSessionDisplayName({
      sessionId,
      index,
      namesById: input.namesById,
      pickers,
      navArmed,
      logs
    })
    return {
      sessionId,
      index,
      isActive: sessionId === input.activeId,
      summary,
      displayName
    }
  })
}
