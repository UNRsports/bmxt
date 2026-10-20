import type { ListResult } from "../../command-line/list-output/types.ts"
import type { PickerEntry, PickerSource } from "../../side-picker/model/picker-entry.ts"
import {
  SEARCH_HIT_PAGE_MATCHES_FIELD,
  parseSearchPageMatchesField
} from "../../search/search-page-matches-list-field.ts"

const KNOWN_SOURCES: readonly PickerSource[] = [
  "tab",
  "history",
  "bookmark",
  "page",
  "snapshot"
]

function parseSourceToken(raw: string): PickerSource {
  const token = raw.trim().toLowerCase()
  for (const source of KNOWN_SOURCES) {
    if (source === token) {
      return source
    }
  }
  return "history"
}

function parsePositiveId(raw: unknown): number | undefined {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    return raw
  }
  return undefined
}

/**
 * EN: Build search picker entries from `search.hit` records.
 * JA: `search.hit` からピッカー行を復元（`pageMatchesJson` があれば本文ヒットも復元）。
 */
export function pickerEntriesFromSearchListResult(listResult: ListResult): {
  entries: PickerEntry[]
  pattern: string
  emptyResultLines: string[] | undefined
} {
  const entries: PickerEntry[] = []
  const emptyResultLines: string[] = []
  let pattern = ""

  for (const record of listResult.records) {
    if (record.kind !== "search.hit") {
      continue
    }
    const fields = record.fields
    const fieldPattern = fields.pattern
    if (typeof fieldPattern === "string" && fieldPattern.length > 0 && pattern.length === 0) {
      pattern = fieldPattern
    }

    const sourceRaw = String(fields.source ?? "")
    if (sourceRaw === "notice" || fields.url === "" || fields.url === null) {
      const label = record.display?.label ?? String(fields.title ?? "")
      if (label.trim().length > 0) {
        emptyResultLines.push(label)
      }
      continue
    }

    const sourceParts = sourceRaw
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
    const sources = sourceParts.map(parseSourceToken)
    const primary = sources[0] ?? "history"
    const tabId = parsePositiveId(fields.tabId)
    const windowId = parsePositiveId(fields.windowId)
    const pageMatches = parseSearchPageMatchesField(fields[SEARCH_HIT_PAGE_MATCHES_FIELD])

    const entry: PickerEntry = {
      id: `search-${String(fields.index ?? entries.length + 1)}-${String(fields.url)}`,
      source: primary,
      sources: sources.length > 1 ? sources : undefined,
      title: String(fields.title ?? ""),
      url: String(fields.url ?? ""),
      tabId,
      windowId,
      pageMatches
    }
    entries.push(entry)
  }

  return {
    entries,
    pattern,
    emptyResultLines:
      entries.length === 0 && emptyResultLines.length > 0 ? emptyResultLines : undefined
  }
}
