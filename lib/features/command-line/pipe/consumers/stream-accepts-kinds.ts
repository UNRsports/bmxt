import type { BmxtRuleRecord, BmxtRuleStream } from "../../../bmxt-rule/types.ts"

/**
 * EN: True when stdin has no records, or at least one record kind is accepted.
 * Extra kinds (e.g. `page.window` alongside `page.open`) are ignored by the consumer.
 */
export function bmxtRuleStreamAcceptsKinds(
  stream: BmxtRuleStream,
  acceptsKinds: readonly string[]
): boolean {
  if (stream.records.length === 0) {
    return true
  }
  const accepted = new Set(acceptsKinds)
  for (const record of stream.records) {
    if (accepted.has(record.kind)) {
      return true
    }
  }
  return false
}

export function tabIdsFromBmxtRuleStream(stream: BmxtRuleStream): number[] {
  const ids: number[] = []
  for (const record of stream.records) {
    if (record.kind !== "page.open") {
      continue
    }
    const tabId = Number(getTabIdFromRecord(record))
    if (Number.isFinite(tabId) && tabId > 0) {
      ids.push(tabId)
    }
  }
  return ids
}

function getTabIdFromRecord(record: BmxtRuleRecord): number | null {
  for (const [key, value] of record.entries) {
    if (key === "tabId" && typeof value === "number") {
      return value
    }
  }
  return null
}
