import type { PickerEntry, PickerSource } from "./picker-entry"

const SCOPE_RE = /^\[(none|history|bookmark|page)\]$/i

function parseScope(label: string): PickerSource | null {
  const m = SCOPE_RE.exec(label.trim())
  if (!m) {
    return null
  }
  const raw = m[1]!.toLowerCase()
  if (raw === "none") {
    return "history"
  }
  return raw as PickerSource
}

function parseFieldLine(line: string): { key: string; value: string } | null {
  const kv = /^([^:]+):\s*(.*)$/.exec(line)
  if (!kv) {
    return null
  }
  return { key: kv[1]!.trim().toLowerCase(), value: kv[2]! }
}

function isOpenableUrl(url: string): boolean {
  const trimmed = url.trim()
  return (
    trimmed.length > 0 &&
    !trimmed.startsWith("(no ") &&
    (trimmed.startsWith("http://") || trimmed.startsWith("https://"))
  )
}

/**
 * EN: Parse `find -list` terminal blocks (`linesForFindElement` output) into URL entries.
 * JA: find ピッカー用の行ブロックを `PickerEntry` 列に変換する。
 *
 * Block shape:
 * ```
 * [history]
 * title: Example
 * url: https://example.com
 *
 * ```
 * `[none]` blocks use `source: "history"` for display (aggregated scope).
 */
export function pickerEntriesFromFindLines(lines: string[]): PickerEntry[] {
  const entries: PickerEntry[] = []
  let i = 0
  while (i < lines.length) {
    const scope = parseScope(lines[i] ?? "")
    if (!scope) {
      i++
      continue
    }
    let title = ""
    let url = ""
    i++
    while (i < lines.length && lines[i]!.trim() !== "") {
      const field = parseFieldLine(lines[i]!)
      if (field) {
        if (field.key === "title") {
          title = field.value
        } else if (field.key === "url") {
          url = field.value
        }
      }
      i++
    }
    const trimmedUrl = url.trim()
    if (isOpenableUrl(trimmedUrl)) {
      entries.push({
        id: `${scope}-${entries.length}-${trimmedUrl}`,
        source: scope,
        title: title.trim() || trimmedUrl,
        url: trimmedUrl
      })
    }
    i++
  }
  return entries
}
