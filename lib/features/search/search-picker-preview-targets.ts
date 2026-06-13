import {
  listOpenTabsByNormalizedUrl,
  resolveOpenTabForSearchEntry
} from "./search-entry-open-tab"
import type { SearchEntryDetailHit } from "./search-entry-detail-hits"
import type { PickerEntry } from "../side-picker/model/picker-entry"

/** EN: Row indices whose URL is open in a non-discarded scriptable tab (Ctrl+↑↓ jump targets). */
export async function listSearchPickerPreviewTargetIndices(
  entries: readonly PickerEntry[]
): Promise<number[]> {
  const openTabsByUrl = await listOpenTabsByNormalizedUrl()
  const indices: number[] = []
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    if (!entry) {
      continue
    }
    if (await resolveOpenTabForSearchEntry(entry, openTabsByUrl)) {
      indices.push(i)
    }
  }
  return indices
}

/** EN: Detail rows previewable in background (open tab + body page match). */
export async function listSearchDetailPreviewTargetIndices(
  entry: PickerEntry | undefined,
  hits: readonly SearchEntryDetailHit[]
): Promise<number[]> {
  if (!entry || hits.length === 0) {
    return []
  }
  const openTabsByUrl = await listOpenTabsByNormalizedUrl()
  if (!(await resolveOpenTabForSearchEntry(entry, openTabsByUrl))) {
    return []
  }
  const indices: number[] = []
  for (let i = 0; i < hits.length; i++) {
    const hit = hits[i]
    const pageMatchIndex = hit?.pageMatchIndex
    if (pageMatchIndex === undefined) {
      continue
    }
    const match = entry.pageMatches?.[pageMatchIndex]
    if (!match || match.lineNo <= 0) {
      continue
    }
    indices.push(i)
  }
  return indices
}
