/** BMXt プロンプト上の `split` サブオプション Tab 補完。 */

export const SPLIT_OPTION_CANDIDATES = ["-col", "-row"] as const

/**
 * カーソルが `split ` の直後の単一トークン（`-col` / `-row` の入力途中）にあるとき、その範囲を返す。
 */
export function splitOptionCompletionZone(
  line: string,
  cursor: number
): { optionStart: number; prefix: string; optionEnd: number } | null {
  const m = /^\s*split\s+/.exec(line)
  if (!m) {
    return null
  }
  const optionStart = m.index + m[0].length
  if (cursor < optionStart) {
    return null
  }
  const optionEnd = optionStart + (line.slice(optionStart).match(/^[^\s]*/)?.[0].length ?? 0)
  if (cursor > optionEnd) {
    return null
  }
  const prefix = line.slice(optionStart, cursor)
  if (/\s/.test(prefix)) {
    return null
  }
  return { optionStart, prefix, optionEnd }
}

export function listSplitOptionCandidates(prefix: string): string[] {
  const p = prefix.toLowerCase()
  return SPLIT_OPTION_CANDIDATES.filter((opt) => opt.startsWith(p))
}
