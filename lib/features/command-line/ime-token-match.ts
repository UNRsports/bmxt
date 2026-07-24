export type CandidateMatchMode = "prefix" | "contains"

function optionTokenBody(token: string): string {
  return token.replace(/^-+/, "")
}

/**
 * EN: True when `prefix` still narrows at least one option-like candidate
 * (`pi` → `--picker`, `-p` → `--page`, `--hi` → `--history`).
 * Bare letters prefer option-name prefixes so `p` does not match `--snapshot`.
 */
export function matchesOptionTokenFilter(
  candidates: readonly string[],
  prefix: string
): boolean {
  const t = prefix.trim().toLowerCase()
  if (t.length === 0) {
    return false
  }
  const tBody = optionTokenBody(t)
  for (const candidate of candidates) {
    const c = candidate.toLowerCase()
    const cBody = optionTokenBody(c)
    if (t.startsWith("-")) {
      if (c.startsWith(t)) {
        return true
      }
      if (tBody.length > 0 && cBody.startsWith(tBody)) {
        return true
      }
      continue
    }
    if (cBody.startsWith(tBody)) {
      return true
    }
    if (tBody.length >= 2 && (c.includes(t) || cBody.includes(tBody))) {
      return true
    }
  }
  return false
}

export function matchCandidates(
  candidates: readonly string[],
  prefix: string,
  mode: CandidateMatchMode
): string[] {
  if (!prefix) {
    return [...candidates]
  }
  const p = prefix.toLowerCase()
  const pBody = optionTokenBody(p)
  if (mode === "contains") {
    return candidates.filter((c) => {
      const cl = c.toLowerCase()
      const body = optionTokenBody(cl)
      if (p.startsWith("-")) {
        return cl.startsWith(p) || cl.includes(p) || (pBody.length > 0 && body.startsWith(pBody))
      }
      if (body.startsWith(pBody)) {
        return true
      }
      // Substring only for 2+ chars (avoid `p` matching `--snapshot`).
      return pBody.length >= 2 && (body.includes(pBody) || cl.includes(p))
    })
  }
  return candidates.filter((c) => {
    const cl = c.toLowerCase()
    if (cl.startsWith(p)) {
      return true
    }
    if (pBody.length > 0 && optionTokenBody(cl).startsWith(pBody)) {
      return true
    }
    return false
  })
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

/**
 * EN: Resolve filter flags for option-token menus (`--picker`, scopes, flags).
 * Partial bodies (`pi`) use contains against the full candidate list.
 */
export function resolveOptionTokenFilterModes(
  candidates: readonly string[],
  prefix: string,
  matchMode: CandidateMatchMode
): { useFullCandidateList: boolean; filterMode: CandidateMatchMode } {
  const useFullCandidateList =
    matchMode === "contains" || matchesOptionTokenFilter(candidates, prefix)
  let filterMode: CandidateMatchMode = matchMode
  if (useFullCandidateList && !prefix.startsWith("-")) {
    filterMode = "contains"
  }
  return { useFullCandidateList, filterMode }
}
