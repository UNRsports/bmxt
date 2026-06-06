/** EN: Characters shown before/after the needle in the `text:` row. */
export const SEARCH_PICKER_TEXT_CONTEXT_CHARS = 48

/**
 * EN: Clip page snippet to a window around the first case-insensitive needle hit.
 * JA: ページ内スニペットを検索語の前後数十文字に切り出す。
 */
export function excerptAroundNeedle(
  text: string,
  needle: string,
  context = SEARCH_PICKER_TEXT_CONTEXT_CHARS
): string {
  const trimmed = text.trim()
  if (!trimmed) {
    return ""
  }
  const n = needle.trim()
  if (!n) {
    if (trimmed.length <= context * 2 + 8) {
      return trimmed
    }
    return `${trimmed.slice(0, context * 2)}…`
  }
  const lower = trimmed.toLowerCase()
  const nLower = n.toLowerCase()
  const idx = lower.indexOf(nLower)
  if (idx < 0) {
    if (trimmed.length <= context * 2 + 8) {
      return trimmed
    }
    return `${trimmed.slice(0, context * 2)}…`
  }
  const start = Math.max(0, idx - context)
  const end = Math.min(trimmed.length, idx + n.length + context)
  const prefix = start > 0 ? "…" : ""
  const suffix = end < trimmed.length ? "…" : ""
  return `${prefix}${trimmed.slice(start, end)}${suffix}`
}
