import { resolveOpenTabForSearchEntry } from "./search-entry-open-tab"
import type { SearchEntryDetailHit } from "./search-entry-detail-hits"
import type { PickerEntry } from "../side-picker/model/picker-entry"

/** EN: Row indices whose URL is open in a non-discarded scriptable tab (Alt preview targets). */
export async function listSearchPickerPreviewTargetIndices(
  entries: readonly PickerEntry[]
): Promise<number[]> {
  const indices: number[] = []
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    if (!entry) {
      continue
    }
    if (await resolveOpenTabForSearchEntry(entry)) {
      indices.push(i)
    }
  }
  return indices
}

/** EN: Detail rows previewable in background (open tab + page match). */
export async function listSearchDetailPreviewTargetIndices(
  entry: PickerEntry | undefined,
  hits: readonly SearchEntryDetailHit[]
): Promise<number[]> {
  if (!entry || hits.length === 0) {
    return []
  }
  if (!(await resolveOpenTabForSearchEntry(entry))) {
    return []
  }
  const indices: number[] = []
  for (let i = 0; i < hits.length; i++) {
    if (hits[i]?.pageMatchIndex !== undefined) {
      indices.push(i)
    }
  }
  return indices
}
