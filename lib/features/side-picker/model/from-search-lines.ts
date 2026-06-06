import type { SearchPageMatch, PickerEntry, PickerSource } from "./picker-entry"

const SCOPE_RE = /^\[(history|bookmark|page)\]$/i
const MATCH_LINE_RE = /^L(\d+):\s*(.*)$/s

function parseScope(label: string): PickerSource | null {
  const m = SCOPE_RE.exec(label.trim())
  if (!m) {
    return null
  }
  return m[1]!.toLowerCase() as PickerSource
}

function parseFieldLine(line: string): { key: string; value: string } | null {
  const kv = /^([^:]+):\s*(.*)$/.exec(line)
  if (!kv) {
    return null
  }
  return { key: kv[1]!.trim().toLowerCase(), value: kv[2]! }
}

function parseMatchField(value: string): SearchPageMatch | null {
  const legacy = MATCH_LINE_RE.exec(value.trim())
  if (!legacy) {
    return null
  }
  const lineNo = Number.parseInt(legacy[1]!, 10)
  const snippet = legacy[2]!.trim()
  if (!snippet) {
    return null
  }
  return { lineNo: Number.isFinite(lineNo) ? lineNo : 0, snippet, occurrence: 0 }
}

function isOpenableUrl(url: string): boolean {
  const trimmed = url.trim()
  return (
    trimmed.length > 0 &&
    !trimmed.startsWith("(no ") &&
    (trimmed.startsWith("http://") || trimmed.startsWith("https://"))
  )
}

function assignSnippetOccurrences(matches: SearchPageMatch[]): SearchPageMatch[] {
  const counts = new Map<string, number>()
  return matches.map((m) => {
    const key = m.snippet.toLowerCase()
    const occurrence = counts.get(key) ?? 0
    counts.set(key, occurrence + 1)
    return { ...m, occurrence }
  })
}

/**
 * EN: Parse `search -list` result blocks into picker entries.
 * JA: search ピッカー用の行ブロックを `PickerEntry` 列に変換する。
 */
export function pickerEntriesFromSearchLines(lines: string[]): PickerEntry[] {
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
    let tabId: number | undefined
    let windowId: number | undefined
    const pageMatches: SearchPageMatch[] = []
    i++
    while (i < lines.length && lines[i]!.trim() !== "") {
      const field = parseFieldLine(lines[i]!)
      if (field) {
        if (field.key === "title") {
          title = field.value
        } else if (field.key === "url") {
          url = field.value
        } else if (field.key === "tabid") {
          const n = Number.parseInt(field.value, 10)
          if (Number.isFinite(n)) {
            tabId = n
          }
        } else if (field.key === "windowid") {
          const n = Number.parseInt(field.value, 10)
          if (Number.isFinite(n)) {
            windowId = n
          }
        } else if (field.key === "match" || field.key === "line") {
          const parsed = parseMatchField(field.value)
          if (parsed) {
            pageMatches.push(parsed)
          }
        }
      }
      i++
    }
    const trimmedUrl = url.trim()
    if (!isOpenableUrl(trimmedUrl)) {
      i++
      continue
    }
    const normalizedMatches =
      scope === "page" && pageMatches.length > 0
        ? assignSnippetOccurrences(pageMatches)
        : undefined
    entries.push({
      id:
        scope === "page" && tabId != null
          ? `page-tab-${tabId}`
          : `${scope}-${entries.length}-${trimmedUrl}`,
      source: scope,
      title: title.trim() || trimmedUrl,
      url: trimmedUrl,
      tabId: scope === "page" ? tabId : undefined,
      windowId: scope === "page" ? windowId : undefined,
      pageMatches: normalizedMatches
    })
    i++
  }
  return mergePageEntriesByTab(entries)
}

/** EN: Legacy logs used one block per line hit; merge into one row per tab. */
function mergePageEntriesByTab(entries: PickerEntry[]): PickerEntry[] {
  const rest: PickerEntry[] = []
  const byTab = new Map<number, PickerEntry>()
  for (const e of entries) {
    if (e.source !== "page" || e.tabId == null) {
      rest.push(e)
      continue
    }
    const prev = byTab.get(e.tabId)
    if (!prev) {
      byTab.set(e.tabId, {
        ...e,
        pageMatches: e.pageMatches ? [...e.pageMatches] : undefined
      })
      continue
    }
    const combined = [...(prev.pageMatches ?? []), ...(e.pageMatches ?? [])]
    prev.pageMatches = assignSnippetOccurrences(combined)
    if (!prev.windowId && e.windowId) {
      prev.windowId = e.windowId
    }
  }
  return [...rest, ...byTab.values()]
}
