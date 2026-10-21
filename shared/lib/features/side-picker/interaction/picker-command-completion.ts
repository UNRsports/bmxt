export type PickerCommandCompletionState = {
  base: string
  completions: readonly string[]
  idx: number
}

export function cyclePickerCommandCompletion(
  state: PickerCommandCompletionState | null,
  buffer: string,
  completions: readonly string[]
): { state: PickerCommandCompletionState; value: string } | null {
  if (completions.length === 0) {
    return null
  }
  const next =
    state === null
      ? { base: buffer, completions, idx: 0 }
      : { ...state, idx: state.idx + 1 }
  const value = next.completions[next.idx % next.completions.length]!
  return { state: next, value }
}
