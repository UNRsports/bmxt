import type { ListResult } from "../../command-line/list-output/types.ts"
import type { DomListFlavor, DomPickerMode } from "../../dom/dom-picker-mode.ts"

export type DomPickerLinesFromListResult = {
  lines: string[]
  jumpPaths: (number[] | null)[]
  headerLineCount: number
  commandLine: string
  targetTabId: number | undefined
  pickerMode: DomPickerMode
  flavor: DomListFlavor
  showTag: boolean
  pattern: string
}

function parseJumpPath(pathField: string): number[] | null {
  const trimmed = pathField.trim()
  if (trimmed.length === 0) {
    return null
  }
  const parts = trimmed.split(".")
  const path: number[] = []
  for (const part of parts) {
    const n = Number(part)
    if (!Number.isFinite(n)) {
      return null
    }
    path.push(n)
  }
  return path
}

/** EN: Project `dom.*` records into dom picker line state. */
export function domPickerLinesFromListResult(listResult: ListResult): DomPickerLinesFromListResult {
  const lines: string[] = []
  const jumpPaths: (number[] | null)[] = []
  let headerLineCount = 0

  for (const record of listResult.records) {
    if (record.kind === "dom.notice") {
      const label = record.display?.label ?? String(record.fields.line ?? "")
      if (label.trim().length === 0) {
        continue
      }
      lines.push(label)
      jumpPaths.push(null)
      if (record.fields.notice === "header") {
        headerLineCount += 1
      }
      continue
    }
    if (record.kind !== "dom.node") {
      continue
    }
    const label =
      record.display?.label ??
      (typeof record.fields.line === "string" ? record.fields.line : "")
    lines.push(label)
    jumpPaths.push(
      typeof record.fields.path === "string" ? parseJumpPath(record.fields.path) : null
    )
  }

  const sourceTabId = listResult.meta?.sourceTabId

  return {
    lines,
    jumpPaths,
    headerLineCount,
    commandLine: "dom -list",
    targetTabId: typeof sourceTabId === "number" ? sourceTabId : undefined,
    pickerMode: "normal",
    flavor: "--html",
    showTag: false,
    pattern: ""
  }
}
