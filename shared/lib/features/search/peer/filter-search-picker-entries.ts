import type { PickerEntry } from "../../side-picker/model/picker-entry.ts"
import { parsePickerSearchNeedle } from "../../side-picker/search/picker-search-needle.ts"

/**
 * EN: Client-side `/` row reduction for search picker (title+url, or `@` url-only).
 * JA: search picker の `/` 行削減（title+url、または `@` で URL のみ）。
 */
export function filterSearchPickerEntries(
  entries: readonly PickerEntry[],
  filterQuery: string
): PickerEntry[] {
  const { byUrl, needle } = parsePickerSearchNeedle(filterQuery)
  if (needle === "") {
    return [...entries]
  }
  const lc = needle.toLowerCase()
  const out: PickerEntry[] = []
  for (const entry of entries) {
    if (byUrl) {
      if (entry.url.toLowerCase().includes(lc)) {
        out.push(entry)
      }
      continue
    }
    if (entry.title.toLowerCase().includes(lc) || entry.url.toLowerCase().includes(lc)) {
      out.push(entry)
    }
  }
  return out
}
