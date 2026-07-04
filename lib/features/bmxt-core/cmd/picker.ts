import type { CmdMeta } from "../types"
import { linesDispatch } from "../types"
import { getRunLocale } from "../../setting/i18n/run-locale"
import { pickerUsageLines } from "../../picker/usage"

export const CMD: CmdMeta = {
  name: "picker",
  aliases: [],
  usagePrimary: "picker"
}

/**
 * EN: Standalone `picker` prints usage. Interactive UI is only via pipe (`… | picker`).
 * JA: 単体の `picker` は usage のみ。対話 UI はパイプ（`… | picker`）経由。
 */
export function run(_args: string[]) {
  const locale = getRunLocale()
  return linesDispatch(pickerUsageLines(locale))
}
