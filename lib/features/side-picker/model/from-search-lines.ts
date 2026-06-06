import type { PickerEntry, PickerSource, SearchPageMatch } from "./picker-entry"

const SEARCH_MERGE_SOURCES: PickerSource[] = ["history", "bookmark", "page"]

function entrySearchSources(entry: PickerEntry): PickerSource[] {
  if (entry.sources && entry.sources.length > 0) {
    return SEARCH_MERGE_SOURCES.filter((s) => entry.sources!.includes(s))
  }
  if (SEARCH_MERGE_SOURCES.includes(entry.source)) {
    return [entry.source]
  }
  return []
}

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
      sources: [scope],
      title: title.trim() || trimmedUrl,
      url: trimmedUrl,
      tabId: scope === "page" ? tabId : undefined,
      windowId: scope === "page" ? windowId : undefined,
      pageMatches: normalizedMatches
    })
    i++
  }
  return mergeEntriesByUrl(mergePageEntriesByTab(entries))
}

function normalizeUrlForSearchDedup(url: string): string {
  try {
    const u = new URL(url.trim())
    let host = u.hostname.toLowerCase()
    if (host.startsWith("www.")) {
      host = host.slice(4)
    }
    let path = u.pathname
    if (path.length > 1 && path.endsWith("/")) {
      path = path.slice(0, -1)
    }
    return `${host}${path}`
  } catch {
    return url.trim().toLowerCase()
  }
}

function primarySearchSource(entry: PickerEntry): PickerSource {
  const sources = entrySearchSources(entry)
  if (sources.includes("page") && entry.pageMatches && entry.pageMatches.length > 0) {
    return "page"
  }
  return sources[0] ?? entry.source
}

function mergeSearchSources(a: PickerEntry, b: PickerEntry): PickerSource[] {
  const merged = new Set<PickerSource>([...entrySearchSources(a), ...entrySearchSources(b)])
  return SEARCH_MERGE_SOURCES.filter((s) => merged.has(s))
}

function preferSearchTitle(current: string, currentUrl: string, next: string): string {
  const cur = current.trim()
  const nxt = next.trim()
  if (!nxt || nxt === "(no title)") {
    return cur
  }
  if (!cur || cur === "(no title)" || cur === currentUrl) {
    return nxt
  }
  return cur
}

/** EN: One picker row per URL; union history / bookmark / page scope labels. */
function mergeEntriesByUrl(entries: PickerEntry[]): PickerEntry[] {
  const order: PickerEntry[] = []
  const byUrl = new Map<string, PickerEntry>()

  for (const entry of entries) {
    const key = normalizeUrlForSearchDedup(entry.url)
    const prev = byUrl.get(key)
    if (!prev) {
      const row: PickerEntry = {
        ...entry,
        sources: entrySearchSources(entry)
      }
      byUrl.set(key, row)
      order.push(row)
      continue
    }

    prev.sources = mergeSearchSources(prev, entry)
    if (entry.pageMatches && entry.pageMatches.length > 0) {
      const combined = [...(prev.pageMatches ?? []), ...entry.pageMatches]
      prev.pageMatches = assignSnippetOccurrences(combined)
    }
    if (entry.tabId != null) {
      prev.tabId = entry.tabId
    }
    if (entry.windowId != null) {
      prev.windowId = entry.windowId
    }
    prev.title = preferSearchTitle(prev.title, prev.url, entry.title)
    prev.source = primarySearchSource(prev)
    prev.id = prev.tabId != null ? `page-tab-${prev.tabId}` : `search-${key}`
  }

  return order
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
