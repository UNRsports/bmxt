import type { SessionPickerState } from "../side-picker/session/session-pickers"

export type SessionListRow = {
  sessionId: string
  index: number
  isActive: boolean
  summary: string
}

function appendPart(parts: string[], label: string, detail?: string): void {
  if (detail !== undefined && detail.length > 0) {
    parts.push(`${label}:${detail}`)
  } else {
    parts.push(label)
  }
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

export function buildSessionListRows(input: {
  order: readonly string[]
  activeId: string
  pickersBySession: Record<string, SessionPickerState | undefined>
  navArmedByLeaf: Record<string, boolean>
}): SessionListRow[] {
  return input.order.map((sessionId, i) => ({
    sessionId,
    index: i + 1,
    isActive: sessionId === input.activeId,
    summary: buildSessionSummary(
      input.pickersBySession[sessionId],
      input.navArmedByLeaf[sessionId] ?? false
    )
  }))
}
