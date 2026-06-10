export type CandidateMatchMode = "prefix" | "contains"

export function matchCandidates(
  candidates: readonly string[],
  prefix: string,
  mode: CandidateMatchMode
): string[] {
  if (!prefix) {
    return [...candidates]
  }
  const p = prefix.toLowerCase()
  if (mode === "contains") {
    return candidates.filter((c) => c.toLowerCase().includes(p))
  }
  return candidates.filter((c) => c.toLowerCase().startsWith(p))
}

/**
 * EN: Filter manifest third-token candidates while the picker menu is open (contains) or closed (prefix).
 * JA: 第三トークン候補を prefix / contains で絞り込む。
 */
export function pickThirdTokenCandidates(
  allThird: readonly string[],
  prefix: string,
  matchMode: CandidateMatchMode,
  useFullCandidateList: boolean,
  filterMode: CandidateMatchMode = matchMode
): string[] {
  if (allThird.length === 0) {
    return []
  }
  const rawThird = useFullCandidateList
    ? allThird
    : matchCandidates(allThird, prefix, "prefix")
  return matchCandidates(rawThird, prefix, filterMode)
}
