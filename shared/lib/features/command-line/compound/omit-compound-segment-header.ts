/**
 * EN: True when `> fullLine` already echoed this compound run's only segment —
 * skip repeating `[{segment}]` (e.g. picker `#t:… | tab -send …`).
 * JA: 単一セグメントは `> fullLine` 済みなので `[{segment}]` を繰り返さない。
 */
export function shouldOmitCompoundSegmentHeader(compoundSegmentCount: number): boolean {
  return compoundSegmentCount <= 1
}
