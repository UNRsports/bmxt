import type { DomListCapture } from "./dom-list-capture.ts"
import type { ListRecord, ListResult } from "../command-line/list-output/types.ts"
import { LIST_OUTPUT_SCHEMA } from "../command-line/list-output/types.ts"
import type { DomListFlavor, DomPickerMode } from "./dom-picker-mode.ts"
import type { UiLocale } from "../setting/locale.ts"

export function domCaptureToListResult(
  capture: DomListCapture,
  options: {
    flavor: DomListFlavor
    pickerMode: DomPickerMode
    pattern: string
    locale: UiLocale
  }
): ListResult {
  const records: ListRecord[] = []
  const headerLines = capture.lines.slice(0, capture.headerLineCount)
  const dataLines = capture.lines.slice(capture.headerLineCount)
  const dataPaths = capture.jumpPaths.slice(capture.headerLineCount)

  for (const line of headerLines) {
    if (line.trim().length === 0) {
      continue
    }
    records.push({
      kind: "dom.notice",
      fields: { notice: "header" },
      display: { label: line }
    })
  }

  for (let index = 0; index < dataLines.length; index += 1) {
    const line = dataLines[index]!
    const path = dataPaths[index] ?? null
    records.push({
      kind: "dom.node",
      fields: {
        index: index + 1,
        path: path !== null ? path.join(".") : "",
        line
      },
      display: {
        label: line
      },
      pipeLine: [
        "dom.node",
        `index=${index + 1}`,
        `path=${path !== null ? path.join(".") : ""}`,
        `line=${JSON.stringify(line)}`
      ].join("\t")
    })
  }

  if (capture.documentTruncated === true) {
    records.push({
      kind: "dom.notice",
      fields: { notice: "document_truncated" },
      display: { label: "(document capture truncated)" }
    })
  }

  return {
    schema: LIST_OUTPUT_SCHEMA,
    command: "dom",
    subcommand: "-list",
    records,
    meta: {
      truncatedCapture: capture.documentTruncated === true
    }
  }
}
