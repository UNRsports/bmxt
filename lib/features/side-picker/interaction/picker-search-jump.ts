import { pickerEventIsComposing, pickerStopEvent, type PickerKeyEvent } from "./picker-key-event"

/** EN: `n` forward, `N` (Shift+n) backward — vim-style match jump. */
export function pickerSearchJumpDirection(
  e: PickerKeyEvent
): "forward" | "backward" | null {
  if (pickerEventIsComposing(e) || e.ctrlKey || e.metaKey || e.altKey) {
    return null
  }
  if (e.key === "n" && !e.shiftKey) {
    return "forward"
  }
  if (e.key === "N" && e.shiftKey) {
    return "backward"
  }
  return null
}

/**
 * EN: Next match index for `n`/`N` (wraps at ends — unlike clamped j/k).
 * JA: `n`/`N` 用の次インデックス（端でループ。j/k の clamp とは別）。
 */
export function computePickerSearchJumpTarget(
  hi: number,
  matches: readonly number[],
  forward: boolean
): number {
  if (matches.length === 0) {
    return hi
  }
  if (forward) {
    const nextAhead = matches.find((i) => i > hi)
    return nextAhead ?? matches[0]!
  }
  let prevBehind: number | undefined
  for (const i of matches) {
    if (i < hi) {
      prevBehind = i
    } else {
      break
    }
  }
  return prevBehind ?? matches[matches.length - 1]!
}

export type RunPickerSearchJumpOptions = {
  /** EN: When false, do not handle (inactive picker, search/command submode, etc.). */
  enabled: boolean
  hi: number
  highlightPattern: string
  matchIndices: () => readonly number[]
  onJump: (targetHi: number) => void
}

/** EN: Window-capture handler for `n` / `N` among highlighted matches. */
export function runPickerSearchJump(
  e: KeyboardEvent,
  opts: RunPickerSearchJumpOptions
): boolean {
  if (!opts.enabled || opts.highlightPattern === "") {
    return false
  }
  const dir = pickerSearchJumpDirection(e)
  if (dir === null) {
    return false
  }
  const matches = opts.matchIndices()
  if (matches.length === 0) {
    pickerStopEvent(e)
    return true
  }
  const target = computePickerSearchJumpTarget(opts.hi, matches, dir === "forward")
  pickerStopEvent(e)
  if (target !== opts.hi) {
    opts.onJump(target)
  }
  return true
}
