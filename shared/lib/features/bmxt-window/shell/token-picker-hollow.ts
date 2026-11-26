import type { TokenPickerModel } from "../token-picker-panel"

/**
 * EN: True when the open picker is already in the empty-filter keep-alive shape.
 * JA: 絞り込みゼロの keep-alive 形（ヒントのみ）なら true。
 */
export function isHollowTokenPickerModel(model: TokenPickerModel): boolean {
  return (
    model.candidates.length === 0 &&
    model.candidateLabels === undefined &&
    model.candidateRows === undefined &&
    model.candidateHelps === undefined &&
    model.hi === 0
  )
}
