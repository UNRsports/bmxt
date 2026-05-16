import type { PickerEntry, PickerSource } from "./picker-entry"

const SCOPE_RE = /^\[(history|bookmark|page)\]$/i

function parseScope(label: string): PickerSource | null {
  const m = SCOPE_RE.exec(label.trim())
  if (!m) {
    return null
  }
  return m[1]!.toLowerCase() as PickerSource
}

/**
 * EN: Parse `find -list` terminal blocks (`linesForFindElement` output) into URL entries.
 * JA: find ピッカー用の行ブロックを `PickerEntry` 列に変換する。
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
      const kv = /^([^:]+):\s*(.*)$/.exec(lines[i]!)
      if (kv) {
        const key = kv[1]!.trim().toLowerCase()
        const val = kv[2]!
        if (key === "title") {
          title = val
        } else if (key === "url") {
          url = val
        }
      }
      i++
    }
    const trimmedUrl = url.trim()
    if (
      trimmedUrl &&
      !trimmedUrl.startsWith("(no ") &&
      (trimmedUrl.startsWith("http://") || trimmedUrl.startsWith("https://"))
    ) {
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
