export type PickerSource = "tab" | "history" | "bookmark" | "page"

/** EN: One innerText line hit inside an open tab (`search -list --page`). */
export type SearchPageMatch = {
  lineNo: number
  snippet: string
  /** EN: Nth DOM occurrence of `snippet` on the tab (case-insensitive). */
  occurrence: number
}
export type PickerEntry = {
  id: string
  source: PickerSource
  title: string
  url: string
  tabId?: number
  windowId?: number
  groupId?: number | null
  /** EN: Grouped line hits when `source === "page"` (one picker row per tab). */
  pageMatches?: SearchPageMatch[]
  /** EN: Search hits merged by URL — which scopes matched (history / bookmark / page). */
  sources?: PickerSource[]
  meta?: Record<string, string>
}

const SEARCH_SOURCE_ORDER: PickerSource[] = ["history", "bookmark", "page"]

/** EN: Ordered scope labels for a merged search row. */
export function pickerEntrySearchSources(entry: PickerEntry): PickerSource[] {
  if (entry.sources && entry.sources.length > 0) {
    return SEARCH_SOURCE_ORDER.filter((s) => entry.sources!.includes(s))
  }
  if (SEARCH_SOURCE_ORDER.includes(entry.source)) {
    return [entry.source]
  }
  return []
}

/** EN: True when a search row should offer the in-picker open-target tree (`[history]`). */
export function searchEntryOffersOpenDestination(entry: PickerEntry): boolean {
  return pickerEntrySearchSources(entry).includes("history")
}

/** EN: Picker row prefix for search results, e.g. `[history, page]`. */
export function searchPickerSourceLabel(entry: PickerEntry): string {
  const sources = pickerEntrySearchSources(entry)
  if (sources.length === 0) {
    return `[${entry.source}]`
  }
  return `[${sources.join(", ")}]`
}

export function entryDisplayLine(entry: PickerEntry): string {
  return searchPickerSummaryLine(entry)
}

/** EN: One picker row per tab; hit count only (detail shown in headline while cycling n/N). */
export function searchPickerSummaryLine(entry: PickerEntry): string {
  const title = entry.title.trim() || "(no title)"
  const url = entry.url.trim()
  const label = searchPickerSourceLabel(entry)
  const base =
    url && !url.startsWith("(no ")
      ? `${label} ${title} — ${url}`
      : `${label} ${title}`
  const n = entry.pageMatches?.length ?? 0
  if (n > 1) {
    return `${base} · ${n} hits · n/N cycle`
  }
  if (n === 1) {
    const m = entry.pageMatches![0]!
    const lineTag = m.lineNo > 0 ? `L${m.lineNo}: ` : ""
    const preview =
      m.snippet.length > 56 ? `${m.snippet.slice(0, 55)}…` : m.snippet
    return `${base} · ${lineTag}${preview}`
  }
  return base
}

/** EN: Full detail for the active page hit (headline suffix). */
export function searchPickerMatchDetail(entry: PickerEntry, matchHi = 0): string {
  const m = entry.pageMatches?.[matchHi] ?? entry.pageMatches?.[0]
  if (!m) {
    return ""
  }
  const lineTag = m.lineNo > 0 ? `L${m.lineNo}: ` : ""
  return `${lineTag}${m.snippet}`
}

/** EN: Picker row text; `matchHi` selects which page hit snippet to show. */
export function searchPickerDisplayLine(entry: PickerEntry, matchHi = 0): string {
  const title = entry.title.trim() || "(no title)"
  const url = entry.url.trim()
  const label = searchPickerSourceLabel(entry)
  const base =
    url && !url.startsWith("(no ")
      ? `${label} ${title} — ${url}`
      : `${label} ${title}`
  const matches = entry.pageMatches
  if (!matches || matches.length === 0) {
    return base
  }
  const n = matches.length
  const m = matches[Math.min(Math.max(0, matchHi), n - 1)]!
  const hitLabel = n > 1 ? ` · hit ${matchHi + 1}/${n}` : ""
  const lineTag = m.lineNo > 0 ? `L${m.lineNo}: ` : ""
  const preview =
    m.snippet.length > 72 ? `${m.snippet.slice(0, 71)}…` : m.snippet
  return `${base}${hitLabel} · ${lineTag}${preview}`
}
