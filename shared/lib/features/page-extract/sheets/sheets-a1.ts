/**
 * EN: 0-based column index → A1 column letters (A, B, …, Z, AA, …).
 * JA: 0 始まり列番号を A1 列文字へ。
 */

export function columnIndexToLetters(colZeroBased: number): string {
  if (!Number.isFinite(colZeroBased) || colZeroBased < 0) {
    return "A"
  }
  let n = Math.floor(colZeroBased) + 1
  let out = ""
  while (n > 0) {
    const rem = (n - 1) % 26
    out = String.fromCharCode(65 + rem) + out
    n = Math.floor((n - 1) / 26)
  }
  return out || "A"
}

/** EN: A1 cell reference from 0-based column and 1-based row. */
export function cellRefFromIndices(colZeroBased: number, rowOneBased: number): string {
  const row =
    Number.isFinite(rowOneBased) && rowOneBased >= 1 ? Math.floor(rowOneBased) : 1
  return `${columnIndexToLetters(colZeroBased)}${row}`
}
