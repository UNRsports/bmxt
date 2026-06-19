import type { TerminalSessionsStateV1 } from "./types"

/** EN: True when session bar / pane switch UI does not need a React update. */
export function sessionsUiSnapshotEqual(
  a: TerminalSessionsStateV1,
  b: TerminalSessionsStateV1
): boolean {
  if (a.activeId !== b.activeId) {
    return false
  }
  if (a.order.length !== b.order.length) {
    return false
  }
  for (let i = 0; i < a.order.length; i += 1) {
    if (a.order[i] !== b.order[i]) {
      return false
    }
  }
  for (const id of a.order) {
    if (a.namesById[id] !== b.namesById[id]) {
      return false
    }
    const la = a.logsById[id]
    const lb = b.logsById[id]
    if (la === lb) {
      continue
    }
    if (!la || !lb || la.length !== lb.length) {
      return false
    }
  }
  return true
}

/** EN: Reuse unchanged log arrays so inactive session panes skip re-render. */
export function mergeSessionsStatePreservingStableRefs(
  prev: TerminalSessionsStateV1 | null,
  next: TerminalSessionsStateV1
): TerminalSessionsStateV1 {
  if (!prev) {
    return next
  }
  if (sessionsUiSnapshotEqual(prev, next)) {
    return prev
  }
  const logsById: Record<string, string[]> = { ...next.logsById }
  for (const id of next.order) {
    const prevLog = prev.logsById[id]
    const nextLog = next.logsById[id] ?? []
    if (
      prevLog &&
      prevLog.length === nextLog.length &&
      (nextLog.length === 0 ||
        (prevLog.length > 0 &&
          prevLog[prevLog.length - 1] === nextLog[nextLog.length - 1]))
    ) {
      logsById[id] = prevLog
    }
  }
  if (prev.order.length === next.order.length && prev.order.every((id, i) => id === next.order[i])) {
    let namesSame = true
    for (const id of next.order) {
      if (prev.namesById[id] !== next.namesById[id]) {
        namesSame = false
        break
      }
    }
    if (namesSame) {
      let logsSame = true
      for (const id of next.order) {
        if (logsById[id] !== prev.logsById[id]) {
          logsSame = false
          break
        }
      }
      if (logsSame) {
        return { ...prev, activeId: next.activeId }
      }
    }
  }
  return { ...next, logsById }
}
