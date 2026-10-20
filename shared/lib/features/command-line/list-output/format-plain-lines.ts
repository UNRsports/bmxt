import type { ListRecord, ListResult } from "./types.ts"

function indentSpaces(depth: number): string {
  if (depth <= 0) {
    return ""
  }
  return "  ".repeat(depth)
}

function formatRecordPlainLine(record: ListRecord, showUrl: boolean): string {
  if (record.display !== undefined) {
    const prefix = indentSpaces(record.display.indent ?? 0)
    const detail =
      showUrl && record.display.detail !== undefined && record.display.detail.length > 0
        ? `  ${record.display.detail}`
        : ""
    return `${prefix}${record.display.label}${detail}`
  }
  return record.kind
}

export type FormatPlainOptions = {
  showUrl?: boolean
}

/** EN: Plain terminal lines from ListResult (no mid-stream truncation). */
export function formatListPlainLines(
  result: ListResult,
  options: FormatPlainOptions = {}
): string[] {
  const showUrl = options.showUrl === true
  return result.records.map((record) => formatRecordPlainLine(record, showUrl))
}
