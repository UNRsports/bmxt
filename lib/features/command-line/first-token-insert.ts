import type { ImeTokenTier } from "./ime-token-picker.ts"
import { FALLBACK_COMPLETION_CANDIDATES } from "../builtin-commands/completion-fallback.ts"
import { wordBounds } from "../format/word-bounds.ts"

function isKnownFirstCommand(cmd: string): boolean {
  const k = cmd.toLowerCase()
  return FALLBACK_COMPLETION_CANDIDATES.includes(k)
}

/** EN: True when picking a first-tier token should prepend before an existing command tail. */
export function isFirstTierPrependPick(line: string, cursor: number, tier: ImeTokenTier): boolean {
  if (tier !== "first") {
    return false
  }
  const trimmed = line.trim()
  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length < 2) {
    return false
  }
  const firstContentStart = line.search(/\S/)
  if (firstContentStart < 0) {
    return false
  }
  const [wordStart] = wordBounds(line, cursor)
  const prefix = line.slice(wordStart, cursor)
  if (prefix.length === 0 && cursor <= firstContentStart) {
    return true
  }
  if (wordStart !== firstContentStart || prefix.length === 0) {
    return false
  }
  const firstPart = parts[0]!
  if (firstPart === prefix) {
    return true
  }
  if (firstPart.startsWith(prefix) && !isKnownFirstCommand(firstPart)) {
    return firstPart.slice(prefix.length).length > 0
  }
  return false
}

/** EN: Build `browse setting -list` from a prepend pick — drops the filter prefix, keeps the tail. */
export function buildFirstTierPrependPickLine(
  line: string,
  cursor: number,
  pickedToken: string
): { line: string; cursor: number } {
  const trimmed = line.trim()
  const parts = trimmed.split(/\s+/).filter(Boolean)
  const leading = line.match(/^\s*/)?.[0] ?? ""
  const firstContentStart = line.search(/\S/)
  const [wordStart] = wordBounds(line, cursor)
  const prefix = line.slice(wordStart, cursor)

  let tail: string
  if (prefix.length === 0 && cursor <= firstContentStart) {
    tail = trimmed
  } else {
    const afterFirst = parts.slice(1)
    const stripped = parts[0]!.slice(prefix.length)
    tail = stripped.length > 0 ? [stripped, ...afterFirst].join(" ") : afterFirst.join(" ")
  }

  const nextLine = `${leading}${pickedToken} ${tail}`
  const nextPos = leading.length + pickedToken.length + 1
  return { line: nextLine, cursor: nextPos }
}

/**
 * EN: True when a token pick must insert so trailing command text is preserved.
 * JA: 後続の入力を消さないよう、候補選択を挿入に切り替える。
 */
export function shouldInsertTokenPickAtCursor(
  line: string,
  cursor: number,
  _tokenStart: number,
  _tokenEnd: number,
  tier: ImeTokenTier
): boolean {
  return isFirstTierPrependPick(line, cursor, tier)
}
