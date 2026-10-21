import type { BmxtRuleEntry, BmxtRuleProducer, BmxtRuleRecord, BmxtRuleScalar } from "./types.ts"

function isScalar(value: unknown): value is BmxtRuleScalar {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  )
}

/** EN: Read one entry by key (first match). */
export function getBmxtRuleEntry(
  record: Pick<BmxtRuleRecord, "entries">,
  key: string
): BmxtRuleScalar | undefined {
  for (const entry of record.entries) {
    if (entry[0] === key) {
      return entry[1]
    }
  }
  return undefined
}

/** EN: Read producer metadata entry. */
export function getBmxtRuleProducerEntry(
  producer: BmxtRuleProducer | undefined,
  key: string
): BmxtRuleScalar | undefined {
  if (producer === undefined) {
    return undefined
  }
  for (const entry of producer) {
    if (entry[0] === key) {
      return entry[1]
    }
  }
  return undefined
}

/** EN: Build entry array from a plain object (unknown keys allowed). */
export function bmxtRuleEntriesFromObject(
  fields: Readonly<Record<string, BmxtRuleScalar>>
): BmxtRuleEntry[] {
  const entries: BmxtRuleEntry[] = []
  for (const [key, value] of Object.entries(fields)) {
    if (isScalar(value)) {
      entries.push([key, value])
    }
  }
  return entries
}

/** EN: Merge object fields into an existing entry array (later keys override). */
export function mergeBmxtRuleEntries(
  base: readonly BmxtRuleEntry[],
  patch: Readonly<Record<string, BmxtRuleScalar>>
): BmxtRuleEntry[] {
  const map = new Map<string, BmxtRuleScalar>()
  for (const [key, value] of base) {
    map.set(key, value)
  }
  for (const [key, value] of Object.entries(patch)) {
    if (isScalar(value)) {
      map.set(key, value)
    }
  }
  return [...map.entries()]
}

export function bmxtRuleRecord(kind: string, fields: Readonly<Record<string, BmxtRuleScalar>>): BmxtRuleRecord {
  return {
    kind,
    entries: bmxtRuleEntriesFromObject(fields)
  }
}

export function bmxtRuleProducer(fields: Readonly<Record<string, BmxtRuleScalar>>): BmxtRuleProducer {
  return bmxtRuleEntriesFromObject(fields)
}
