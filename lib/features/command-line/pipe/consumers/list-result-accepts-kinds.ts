import type { ListRecordKind, ListResult } from "../../list-output/types.ts"

/**
 * EN: True when stdin has no records, or at least one record kind is accepted.
 * Extra kinds (e.g. `tabs.window` alongside `tabs.tab`) are ignored by the consumer.
 */
export function listResultAcceptsKinds(
  listResult: ListResult,
  acceptsKinds: readonly ListRecordKind[]
): boolean {
  if (listResult.records.length === 0) {
    return true
  }
  const accepted = new Set(acceptsKinds)
  for (const record of listResult.records) {
    if (accepted.has(record.kind)) {
      return true
    }
  }
  return false
}
