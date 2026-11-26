/**
 * EN: MOVE destination navigation helpers for the tab-picker adapter.
 * JA: タブピッカー・アダプタ向け MOVE 移動先ナビヘルパ。
 *
 * When any tab group is marked (`markedKind === "group"`), destinations are
 * window / group header rows only — not tab-gap insert slots.
 */

import type { TabPickerRow } from "./picker-rows.ts"
import type { SelectKind } from "./tab-picker-overlay-types.ts"

/** EN: True when MOVE should land only on window/group headers. */
export function isMoveHeaderDestMode(markedKind: SelectKind | null): boolean {
  return markedKind === "group"
}

/**
 * EN: Indices into `visibleRowIndices` whose underlying row is window or group.
 * JA: `visibleRowIndices` のうち実体が window / group 行である位置の一覧。
 */
export function moveHeaderDestVisibleIndices(
  rows: readonly TabPickerRow[],
  visibleRowIndices: readonly number[]
): number[] {
  const out: number[] = []
  for (let vi = 0; vi < visibleRowIndices.length; vi++) {
    const ri = visibleRowIndices[vi]
    if (ri === undefined || ri < 0 || ri >= rows.length) {
      continue
    }
    const row = rows[ri]
    if (row === undefined) {
      continue
    }
    if (row.kind === "window" || row.kind === "group") {
      out.push(vi)
    }
  }
  return out
}

/**
 * EN: Snap a visible-hi to the nearest header dest (prefer current / next, else prev).
 * JA: 可視 hi を最近傍のヘッダ行へスナップ（現在／次優先、なければ前）。
 */
export function snapMoveDestToHeaderVisibleIndex(
  rows: readonly TabPickerRow[],
  visibleRowIndices: readonly number[],
  preferredVisibleHi: number
): number {
  const headers = moveHeaderDestVisibleIndices(rows, visibleRowIndices)
  if (headers.length === 0) {
    return Math.max(0, Math.min(preferredVisibleHi, visibleRowIndices.length - 1))
  }
  if (headers.includes(preferredVisibleHi)) {
    return preferredVisibleHi
  }
  for (const vi of headers) {
    if (vi >= preferredVisibleHi) {
      return vi
    }
  }
  const last = headers[headers.length - 1]
  return last ?? 0
}

/**
 * EN: Step MOVE cursor within header dests (wrap). Falls back to full visible wrap.
 * JA: ヘッダ移動先のみで MOVE カーソルを進める（ラップ）。無ければ全可視行。
 */
export function stepMoveDestVisibleIndex(
  rows: readonly TabPickerRow[],
  visibleRowIndices: readonly number[],
  currentMoveDestHi: number,
  delta: 1 | -1,
  headerOnly: boolean
): number {
  const len = visibleRowIndices.length
  if (len === 0) {
    return 0
  }
  if (!headerOnly) {
    return (currentMoveDestHi + delta + len) % len
  }
  const headers = moveHeaderDestVisibleIndices(rows, visibleRowIndices)
  if (headers.length === 0) {
    return (currentMoveDestHi + delta + len) % len
  }
  let pos = headers.indexOf(currentMoveDestHi)
  if (pos < 0) {
    const snapped = snapMoveDestToHeaderVisibleIndex(
      rows,
      visibleRowIndices,
      currentMoveDestHi
    )
    pos = headers.indexOf(snapped)
    if (pos < 0) {
      return headers[0] ?? 0
    }
    if (delta < 0) {
      return snapped
    }
  }
  const nextPos = (pos + delta + headers.length) % headers.length
  return headers[nextPos] ?? headers[0] ?? 0
}
