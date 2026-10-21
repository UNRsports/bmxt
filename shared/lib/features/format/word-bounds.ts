/** EN: Start/end indices of the whitespace-delimited token under `pos`. JA: `pos` 上のトークン境界 [開始, 終了)。 */
export function wordBounds(s: string, pos: number): [number, number] {
  let l = pos
  while (l > 0 && !/\s/.test(s[l - 1]!)) {
    l--
  }
  let r = pos
  while (r < s.length && !/\s/.test(s[r]!)) {
    r++
  }
  return [l, r]
}
