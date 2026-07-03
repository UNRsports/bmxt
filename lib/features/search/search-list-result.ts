import type { ListRecord, ListResult } from "../command-line/list-output/types.ts"
import { LIST_OUTPUT_SCHEMA } from "../command-line/list-output/types.ts"
import type { PickerEntry } from "../side-picker/model/picker-entry.ts"
import {
  pickerEntrySearchSources,
  searchPickerSummaryLine
} from "../side-picker/model/picker-entry.ts"

export function buildSearchListResult(
  entries: readonly PickerEntry[],
  pattern: string
): ListResult {
  const records: ListRecord[] = entries.map((entry, index) => {
    const sources = pickerEntrySearchSources(entry)
    const sourceLabel = sources.length > 0 ? sources.join(",") : entry.source
    const hitCount = entry.pageMatches?.length ?? 0
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
        label: searchPickerSummaryLine(entry)
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
