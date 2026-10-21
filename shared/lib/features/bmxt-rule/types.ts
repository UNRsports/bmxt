/** EN: Canonical inter-command stream schema (bmxtRule). */

export const BMXT_RULE_SCHEMA = "bmxt-rule/1" as const

/** EN: Scalar values allowed in bmxtRule entry arrays. */
export type BmxtRuleScalar = string | number | boolean | null

/**
 * EN: One attribute as `[key, value]` — order-free and forward-compatible.
 * Unknown keys are preserved through adapters and serializers.
 */
export type BmxtRuleEntry = readonly [key: string, value: BmxtRuleScalar]

/** EN: Producer metadata uses the same entry-array shape as records. */
export type BmxtRuleProducer = readonly BmxtRuleEntry[]

/** EN: One stream record. `entries` may grow or shrink across bmxtRule versions. */
export type BmxtRuleRecord = {
  kind: string
  entries: readonly BmxtRuleEntry[]
}

/** EN: Full stream passed between pipe stages (in-memory; NDJSON is a projection). */
export type BmxtRuleStream = {
  schema: typeof BMXT_RULE_SCHEMA
  producer?: BmxtRuleProducer
  records: readonly BmxtRuleRecord[]
}
