/**
 * EN: Keep the highlighted DOM picker row visible inside the scrollable list column.
 * JA: DOM ピッカー列内でハイライト行が常に見えるようスクロールする。
 */
export function scrollDomPickerListToHi(
  listEl: HTMLElement | null,
  rowIdPrefix: string,
  hi: number
): void {
  if (!listEl || hi < 0) {
    return
  }
  const row = document.getElementById(`${rowIdPrefix}-${hi}`)
  if (!row) {
    return
  }
  row.scrollIntoView({ block: "nearest", inline: "nearest" })
}
