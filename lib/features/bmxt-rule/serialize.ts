import { BMXT_RULE_SCHEMA, type BmxtRuleRecord, type BmxtRuleStream } from "./types.ts"
import { assertBmxtRuleStream, validateBmxtRuleRecord } from "./validate.ts"

/** EN: Serialize one record to NDJSON line (bmxtRule wire projection). */
export function serializeBmxtRuleRecordLine(record: BmxtRuleRecord): string {
  return JSON.stringify(record)
}

/** EN: Serialize stream records to NDJSON lines (producer metadata omitted per line). */
export function serializeBmxtRuleStreamLines(stream: BmxtRuleStream): string[] {
  return stream.records.map((record) => serializeBmxtRuleRecordLine(record))
}

/** EN: Serialize full stream envelope (single JSON value) for fixtures and export. */
export function serializeBmxtRuleStreamJson(stream: BmxtRuleStream): string {
  return JSON.stringify(stream)
}

/** EN: Parse one NDJSON record line. */
export function parseBmxtRuleRecordLine(line: string): BmxtRuleRecord {
  const parsed: unknown = JSON.parse(line)
  if (!validateBmxtRuleRecord(parsed)) {
    throw new Error("invalid bmxtRule record line")
  }
  return parsed
}

/** EN: Parse NDJSON lines into a stream (optional producer metadata). */
export function parseBmxtRuleNdjsonLines(
  lines: readonly string[],
  producer?: BmxtRuleStream["producer"]
): BmxtRuleStream {
  const records: BmxtRuleRecord[] = []
  for (const raw of lines) {
    const line = raw.trim()
    if (line.length === 0) {
      continue
    }
    records.push(parseBmxtRuleRecordLine(line))
  }
  const stream: BmxtRuleStream = {
    schema: BMXT_RULE_SCHEMA,
    records
  }
  if (producer !== undefined) {
    stream.producer = producer
  }
  return assertBmxtRuleStream(stream)
}

/** EN: Parse full stream JSON envelope. */
export function parseBmxtRuleStreamJson(text: string): BmxtRuleStream {
  const parsed: unknown = JSON.parse(text)
  return assertBmxtRuleStream(parsed)
}
