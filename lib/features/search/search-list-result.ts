import type { ListRecord, ListResult } from "../command-line/list-output/types.ts"
import { LIST_OUTPUT_SCHEMA } from "../command-line/list-output/types.ts"
import type { PickerEntry } from "../side-picker/model/picker-entry.ts"
import {
  pickerEntrySearchSources,
  searchPickerSummaryLine
} from "../side-picker/model/picker-entry.ts"

function noticeRecordsFromAdapterLines(
  adapterLines: readonly string[],
  pattern: string
): ListRecord[] {
  const records: ListRecord[] = []
  let index = 0
  for (const line of adapterLines) {
    if (line.trim().length === 0) {
      continue
    }
    index += 1
    records.push({
      kind: "search.hit",
      fields: {
        index,
        source: "notice",
        title: line,
        url: "",
        tabId: null,
        hitCount: 0,
        pattern
      },
      display: { label: line }
    })
  }
  return records
}

export function buildSearchListResult(
  entries: readonly PickerEntry[],
  pattern: string,
  adapterLines: readonly string[] = []
): ListResult {
  if (entries.length === 0) {
    return {
      schema: LIST_OUTPUT_SCHEMA,
      command: "search",
      subcommand: "-list",
      records: noticeRecordsFromAdapterLines(adapterLines, pattern)
    }
  }

  const records: ListRecord[] = entries.map((entry, index) => {
    const sources = pickerEntrySearchSources(entry)
    const sourceLabel = sources.length > 0 ? sources.join(",") : entry.source
    const hitCount = entry.pageMatches?.length ?? 0
    const summary = searchPickerSummaryLine(entry)
    return {
      kind: "search.hit",
      fields: {
        index: index + 1,
        source: sourceLabel,
        title: entry.title,
        url: entry.url,
        tabId: entry.tabId ?? null,
        hitCount,
        pattern
      },
      display: {
        label: summary,
        detail: entry.url
      },
      pipeLine: [
        "search.hit",
        `index=${index + 1}`,
        `source=${sourceLabel}`,
        `title=${JSON.stringify(entry.title)}`,
        `url=${JSON.stringify(entry.url)}`,
        `tabId=${entry.tabId ?? ""}`,
        `hitCount=${hitCount}`,
        `pattern=${JSON.stringify(pattern)}`
      ].join("\t")
    }
  })

  return {
    schema: LIST_OUTPUT_SCHEMA,
    command: "search",
    subcommand: "-list",
    records
  }
}
