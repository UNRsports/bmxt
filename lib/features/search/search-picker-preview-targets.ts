import { resolveOpenTabForSearchEntry } from "./search-entry-open-tab"
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
