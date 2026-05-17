/** EN: Vertical focus among DOM tree rows (skip meta / notice lines). */

export function firstFocusableDomLineIndex(
  jumpPaths: readonly (readonly number[] | null)[]
): number {
  for (let i = 0; i < jumpPaths.length; i += 1) {
    if (jumpPaths[i] != null) {
      return i
    }
  }
  return -1
}

export function adjacentDomFocusHi(
  hi: number,
  delta: 1 | -1,
  jumpPaths: readonly (readonly number[] | null)[],
  lineCount: number
): number {
  if (lineCount <= 0) {
    return 0
  }
  let i = hi
  for (let n = 0; n < lineCount; n += 1) {
    i = (i + delta + lineCount) % lineCount
    if (jumpPaths[i] != null) {
      return i
    }
  }
  return hi
}
