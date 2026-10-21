/**
 * EN: Keep the highlighted row visible inside a scrollable picker list column.
 * JA: スクロール可能なピッカー列内でハイライト行が見える位置へスクロールする。
 */

export type ScrollPickerListRowOptions = {
  /** EN: Scroll even when partially visible — row aligns to list top (Alt preview jumps). */
  alignStart?: boolean
}

/** EN: Scroll `listEl` only when `rowEl` is outside the visible list viewport. */
export function scrollPickerListRowIntoView(
  listEl: HTMLElement,
  rowEl: HTMLElement,
  options?: ScrollPickerListRowOptions
): void {
  const listRect = listEl.getBoundingClientRect()
  const rowRect = rowEl.getBoundingClientRect()
  if (
    !options?.alignStart &&
    rowRect.top >= listRect.top &&
    rowRect.bottom <= listRect.bottom
  ) {
    return
  }
  if (options?.alignStart || rowRect.top < listRect.top) {
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
  hi: number,
  options?: ScrollPickerListRowOptions
): void {
  if (!listEl || hi < 0) {
    return
  }
  const row = findPickerListRow(listEl, rowIdPrefix, hi)
  if (!row) {
    return
  }
  scrollPickerListRowIntoView(listEl, row, options)
}

/** EN: Run now and once after layout — rows with dynamic height may need a second pass. */
export function scrollPickerListToHiAfterLayout(
  listEl: HTMLElement | null,
  rowIdPrefix: string,
  hi: number,
  options?: ScrollPickerListRowOptions
): void {
  scrollPickerListToHi(listEl, rowIdPrefix, hi, options)
  requestAnimationFrame(() => {
    scrollPickerListToHi(listEl, rowIdPrefix, hi, options)
  })
}

/** EN: Smooth scroll so row `hi` stays visible (for Alt preview jumps across skipped rows). */
export function scrollPickerListToHiAnimated(
  listEl: HTMLElement | null,
  rowIdPrefix: string,
  hi: number,
  options?: ScrollPickerListRowOptions
): void {
  if (!listEl || hi < 0) {
    return
  }
  const run = (): void => {
    const row = findPickerListRow(listEl, rowIdPrefix, hi)
    if (!row) {
      return
    }
    scrollPickerListRowIntoViewAnimated(listEl, row, options)
  }
  run()
  requestAnimationFrame(run)
}

/** EN: Smooth scroll when row is outside the list viewport (or alignStart). */
export function scrollPickerListRowIntoViewAnimated(
  listEl: HTMLElement,
  rowEl: HTMLElement,
  options?: ScrollPickerListRowOptions
): void {
  const listRect = listEl.getBoundingClientRect()
  const rowRect = rowEl.getBoundingClientRect()
  let targetScrollTop = listEl.scrollTop
  if (
    !options?.alignStart &&
    rowRect.top >= listRect.top &&
    rowRect.bottom <= listRect.bottom
  ) {
    return
  }
  if (options?.alignStart || rowRect.top < listRect.top) {
    targetScrollTop += rowRect.top - listRect.top
  } else if (rowRect.bottom > listRect.bottom) {
    targetScrollTop += rowRect.bottom - listRect.bottom
  }
  if (targetScrollTop !== listEl.scrollTop) {
    listEl.scrollTo({ top: targetScrollTop, behavior: "smooth" })
  }
}

/** EN: Scroll list column so the active `<mark>` in row `hi` stays visible (n/N within a row). */
export function scrollSearchPickerHighlightIntoView(
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
  const mark = row.querySelector("mark.bmxt-search-picker-hl")
  if (mark instanceof HTMLElement) {
    scrollPickerListRowIntoView(listEl, mark)
  }
}

/** EN: Run now and once after layout — highlight may render after excerpt update. */
export function scrollSearchPickerHighlightIntoViewAfterLayout(
  listEl: HTMLElement | null,
  rowIdPrefix: string,
  hi: number
): void {
  scrollSearchPickerHighlightIntoView(listEl, rowIdPrefix, hi)
  requestAnimationFrame(() => {
    scrollSearchPickerHighlightIntoView(listEl, rowIdPrefix, hi)
  })
}
