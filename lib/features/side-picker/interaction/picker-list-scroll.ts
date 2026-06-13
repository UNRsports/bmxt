/**
 * EN: Keep the highlighted row visible inside a scrollable picker list column.
 * JA: スクロール可能なピッカー列内でハイライト行が見える位置へスクロールする。
 */

/** EN: Scroll `listEl` only when `rowEl` is outside the visible list viewport. */
export function scrollPickerListRowIntoView(
  listEl: HTMLElement,
  rowEl: HTMLElement
): void {
  const listRect = listEl.getBoundingClientRect()
  const rowRect = rowEl.getBoundingClientRect()
  if (rowRect.top >= listRect.top && rowRect.bottom <= listRect.bottom) {
    return
  }
  if (rowRect.top < listRect.top) {
    listEl.scrollTop += rowRect.top - listRect.top
    return
  }
  if (rowRect.bottom > listRect.bottom) {
    listEl.scrollTop += rowRect.bottom - listRect.bottom
  }
}

function findPickerListRow(
  listEl: HTMLElement,
  rowIdPrefix: string,
  hi: number
): HTMLElement | null {
  const id = `${rowIdPrefix}-${hi}`
  const inList = listEl.querySelector<HTMLElement>(`#${CSS.escape(id)}`)
  if (inList) {
    return inList
  }
  const global = document.getElementById(id)
  if (global && listEl.contains(global)) {
    return global
  }
  return null
}

/** EN: Scroll list column so row `hi` stays visible (no-op when already in view). */
export function scrollPickerListToHi(
  listEl: HTMLElement | null,
  rowIdPrefix: string,
  hi: number
): void {
  if (!listEl || hi < 0) {
    return
  }
  const row = findPickerListRow(listEl, rowIdPrefix, hi)
  if (!row) {
    return
  }
  scrollPickerListRowIntoView(listEl, row)
}

/** EN: Run now and once after layout — rows with dynamic height may need a second pass. */
export function scrollPickerListToHiAfterLayout(
  listEl: HTMLElement | null,
  rowIdPrefix: string,
  hi: number
): void {
  scrollPickerListToHi(listEl, rowIdPrefix, hi)
  requestAnimationFrame(() => {
    scrollPickerListToHi(listEl, rowIdPrefix, hi)
  })
}
