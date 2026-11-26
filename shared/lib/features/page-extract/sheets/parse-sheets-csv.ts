/**
 * EN: Minimal RFC-style CSV parser for Google Sheets export (quoted fields, commas, newlines).
 * JA: Google Sheets CSV export 向けの最小 CSV パーサ（引用・カンマ・改行）。
 */

/**
 * EN: Parse CSV text into rows of cell strings. Does not interpret formulas — export is values.
 * JA: CSV を行×セル文字列へ。数式は解釈しない（export は値）。
 */
export function parseSheetsCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let i = 0
  let inQuotes = false
  const n = text.length

  const pushField = (): void => {
    row.push(field)
    field = ""
  }

  const pushRow = (): void => {
    // EN: Trailing empty line after final newline is ignored.
    if (row.length === 1 && row[0] === "" && rows.length > 0) {
      row = []
      return
    }
    rows.push(row)
    row = []
  }

  while (i < n) {
    const ch = text[i]!
    if (inQuotes) {
      if (ch === '"') {
        const next = text[i + 1]
        if (next === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i += 1
        continue
      }
      field += ch
      i += 1
      continue
    }

    if (ch === '"') {
      inQuotes = true
      i += 1
      continue
    }
    if (ch === ",") {
      pushField()
      i += 1
      continue
    }
    if (ch === "\r") {
      pushField()
      pushRow()
      i += 1
      if (text[i] === "\n") {
        i += 1
      }
      continue
    }
    if (ch === "\n") {
      pushField()
      pushRow()
      i += 1
      continue
    }
    field += ch
    i += 1
  }

  if (inQuotes || field.length > 0 || row.length > 0) {
    pushField()
    pushRow()
  }

  return rows
}
