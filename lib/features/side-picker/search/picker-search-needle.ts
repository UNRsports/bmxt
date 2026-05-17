/** `@` 接頭で URL 部分一致、それ以外はタイトル（表示タイトル含む）一致。 */
export function parsePickerSearchNeedle(filterQuery: string): { byUrl: boolean; needle: string } {
  const raw = filterQuery
  const trimmedStart = raw.trimStart()
  const byUrl = trimmedStart.startsWith("@")
  const needle = byUrl ? raw.replace(/^\s*@/, "").trim() : raw.trim()
  return { byUrl, needle }
}

/** @deprecated Use `parsePickerSearchNeedle`. */
export const parseTabPickerSearchNeedle = parsePickerSearchNeedle

function escapeRegExp(s: string): string {
  return s.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&")
}

/**
 * `needle` に対する大文字小文字無視の非重複一致で `text` を分割（ハイライト用）。
 * `needle` が空のときは全文を非一致 1 セグメントとして返す。
 */
export function splitTextHighlightSegments(
  text: string,
  needle: string
): Array<{ text: string; match: boolean }> {
  if (needle === "") {
    return [{ text, match: false }]
  }
  const re = new RegExp(escapeRegExp(needle), "gi")
  const out: Array<{ text: string; match: boolean }> = []
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      out.push({ text: text.slice(last, m.index), match: false })
    }
    out.push({ text: m[0], match: true })
    const adv = m[0].length
    last = m.index + adv
    if (adv === 0) {
      break
    }
  }
  if (last < text.length) {
    out.push({ text: text.slice(last), match: false })
  }
  if (out.length === 0) {
    return [{ text, match: false }]
  }
  return out
}
