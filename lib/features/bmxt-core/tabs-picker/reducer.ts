import type { BulkSubMode, CurrentRow, PickerEvent, PickerState, SelectKind } from "./model"

function clampIndex(cur: number, delta: number, len: number): number {
  if (len === 0) return 0
  const max = len - 1
  const next = Math.min(max, Math.max(0, cur + delta))
  return next
}

function allowedModes(kind: SelectKind): readonly BulkSubMode[] {
  switch (kind) {
    case "window":
      return ["close", "newTab", "edit"]
    case "group":
      return ["move", "close", "newWindow", "edit"]
    case "tab":
      return ["move", "close", "group", "newWindow"]
  }
}

function cycleMode(
  cur: BulkSubMode | null,
  kind: SelectKind,
  direction: number
): BulkSubMode | null {
  const modes = allowedModes(kind)
  if (modes.length === 0) return null
  const step = direction >= 0 ? 1 : -1
  if (cur === null) {
    return step > 0 ? modes[0] : modes[modes.length - 1]
  }
  const idx = modes.indexOf(cur)
  const base = idx >= 0 ? idx : 0
  const len = modes.length
  const next = (((base + step) % len) + len) % len
  return modes[next]
}

function sortDedupNumbers(v: number[]): number[] {
  return [...new Set(v)].sort((a, b) => a - b)
}

function sortDedupStrings(v: string[]): string[] {
  return [...new Set(v)].sort()
}

export function reduce(state: PickerState, ev: PickerEvent): PickerState {
  const next: PickerState = {
    ...state,
    markedTabIds: [...state.markedTabIds],
    markedWindowIds: [...state.markedWindowIds],
    markedGroupKeys: [...state.markedGroupKeys]
  }

  switch (ev.kind) {
    case "moveHi":
      next.hi = clampIndex(next.hi, ev.delta, ev.visibleLen)
      break
    case "moveDest":
      next.moveDestHi = clampIndex(next.moveDestHi, ev.delta, ev.visibleLen)
      break
    case "cycleSubMode": {
      const kind = next.markedKind ?? ev.implicitKind
      if (kind) {
        next.bulkSubMode = cycleMode(next.bulkSubMode, kind, ev.direction)
      }
      break
    }
    case "toggleCurrent": {
      const { row } = ev
      if (next.markedKind && next.markedKind !== row.kind) {
        return state
      }
      if (!next.markedKind) {
        next.markedKind = row.kind
      }
      switch (row.kind) {
        case "tab": {
          if (row.tabId !== undefined) {
            const i = next.markedTabIds.indexOf(row.tabId)
            if (i >= 0) next.markedTabIds.splice(i, 1)
            else next.markedTabIds.push(row.tabId)
            next.markedTabIds = sortDedupNumbers(next.markedTabIds)
          }
          break
        }
        case "window": {
          if (row.windowId !== undefined) {
            const i = next.markedWindowIds.indexOf(row.windowId)
            if (i >= 0) next.markedWindowIds.splice(i, 1)
            else next.markedWindowIds.push(row.windowId)
            next.markedWindowIds = sortDedupNumbers(next.markedWindowIds)
          }
          break
        }
        case "group": {
          if (row.groupKey !== undefined) {
            const i = next.markedGroupKeys.indexOf(row.groupKey)
            if (i >= 0) next.markedGroupKeys.splice(i, 1)
            else next.markedGroupKeys.push(row.groupKey)
            next.markedGroupKeys = sortDedupStrings(next.markedGroupKeys)
          }
          break
        }
      }
      if (
        next.markedTabIds.length === 0 &&
        next.markedWindowIds.length === 0 &&
        next.markedGroupKeys.length === 0
      ) {
        next.markedKind = null
        next.bulkSubMode = null
      }
      break
    }
    case "selectRange": {
      const { input } = ev
      if (input.rows.length === 0) return state
      const maxIdx = input.rows.length - 1
      const a = Math.min(input.anchor, maxIdx)
      const b = Math.min(input.target, maxIdx)
      const lo = Math.min(a, b)
      const hi = Math.max(a, b)
      const first = input.rows[lo]
      if (!first) return state
      const rangeKind = first.kind
      next.markedKind = rangeKind
      next.markedTabIds = []
      next.markedWindowIds = []
      next.markedGroupKeys = []
      for (let i = lo; i <= hi; i++) {
        const r = input.rows[i]
        if (!r || r.kind !== rangeKind) continue
        switch (r.kind) {
          case "tab":
            if (r.tabId !== undefined) next.markedTabIds.push(r.tabId)
            break
          case "window":
            if (r.windowId !== undefined) next.markedWindowIds.push(r.windowId)
            break
          case "group":
            if (r.groupKey !== undefined) next.markedGroupKeys.push(r.groupKey)
            break
        }
      }
      next.markedTabIds = sortDedupNumbers(next.markedTabIds)
      next.markedWindowIds = sortDedupNumbers(next.markedWindowIds)
      next.markedGroupKeys = sortDedupStrings(next.markedGroupKeys)
      if (
        next.markedTabIds.length === 0 &&
        next.markedWindowIds.length === 0 &&
        next.markedGroupKeys.length === 0
      ) {
        next.markedKind = null
        next.bulkSubMode = null
      }
      break
    }
    case "clearMarked":
      next.markedKind = null
      next.bulkSubMode = null
      next.markedTabIds = []
      next.markedWindowIds = []
      next.markedGroupKeys = []
      break
  }

  return next
}

export function reduceWithLooseEventFallback(
  state: PickerState,
  eventJson: string
): PickerState | null {
  let v: { kind?: string; delta?: number; visibleLen?: number }
  try {
    v = JSON.parse(eventJson) as typeof v
  } catch {
    return null
  }
  const kind = v.kind
  if (kind === "moveHi" && typeof v.delta === "number" && typeof v.visibleLen === "number") {
    return { ...state, hi: clampIndex(state.hi, v.delta, v.visibleLen) }
  }
  if (kind === "moveDest" && typeof v.delta === "number" && typeof v.visibleLen === "number") {
    return { ...state, moveDestHi: clampIndex(state.moveDestHi, v.delta, v.visibleLen) }
  }
  return null
}

export function runTabsPickerReduce<TState extends PickerState, TEvent extends PickerEvent>(
  state: TState,
  event: TEvent
): TState {
  try {
    return reduce(state, event) as TState
  } catch {
    const fallback = reduceWithLooseEventFallback(state, JSON.stringify(event))
    return (fallback ?? state) as TState
  }
}
