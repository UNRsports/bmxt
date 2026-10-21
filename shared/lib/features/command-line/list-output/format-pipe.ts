import type { ListFieldValue, ListRecord } from "./types.ts"

function escapeFieldValue(value: ListFieldValue): string {
  if (value === null) {
    return ""
  }
  const raw = String(value)
  if (/[\t\n\r]/.test(raw)) {
    return JSON.stringify(raw)
  }
  return raw
}

/** EN: Default TSV pipe line: `kind\\tkey=val\\t...` */
export function formatRecordPipeLine(record: ListRecord): string {
  if (record.pipeLine !== undefined) {
    return record.pipeLine
  }
  const parts: string[] = [record.kind]
  for (const [key, value] of Object.entries(record.fields)) {
    parts.push(`${key}=${escapeFieldValue(value)}`)
  }
  return parts.join("\t")
}

export function formatListPipeLines(records: readonly ListRecord[]): string[] {
  return records.map((record) => formatRecordPipeLine(record))
}
