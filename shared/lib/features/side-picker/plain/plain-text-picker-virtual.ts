/** EN: Rows rendered above/below the viewport (reduces flicker on fast scroll). */
export const PLAIN_PICKER_ROW_OVERSCAN = 8

/** EN: Below this count, render all rows (measurement overhead not worth it). */
export const PLAIN_PICKER_VIRTUALIZE_MIN = 48

/**
 * EN: Used until a hidden probe row is measured (padding 2×2 + line-height 1.4 × inherited size).
 * JA: 非表示プローブ行の計測前に使う推定行高。
 */
export const PLAIN_PICKER_ROW_HEIGHT_FALLBACK = 24

export function computePlainPickerWindow(
  scrollTop: number,
  viewportHeight: number,
  itemCount: number,
  rowHeight: number,
  overscan = PLAIN_PICKER_ROW_OVERSCAN
): { start: number; end: number } {
  if (itemCount <= 0 || rowHeight <= 0) {
    return { start: 0, end: 0 }
  }
  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan)
  const visible = Math.ceil(viewportHeight / rowHeight) + 2 * overscan
  const end = Math.min(itemCount, start + visible)
  return { start, end }
}

export function scrollTopForPlainPickerIndex(
  scrollTop: number,
  viewportHeight: number,
  index: number,
  rowHeight: number
): number {
  const rowTop = index * rowHeight
  const rowBottom = rowTop + rowHeight
  if (rowTop < scrollTop) {
    return rowTop
  }
  if (rowBottom > scrollTop + viewportHeight) {
    return Math.max(0, rowBottom - viewportHeight)
  }
  return scrollTop
}
