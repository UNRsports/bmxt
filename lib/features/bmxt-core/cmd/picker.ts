import type { CmdMeta } from "../types"
import { linesDispatch } from "../types"
import { getRunLocale } from "../../setting/i18n/run-locale"
import { tCmd } from "../../setting/i18n/ns/cmd"
import { pickerUsageLines } from "../../picker/usage"

export const CMD: CmdMeta = {
  name: "picker",
  aliases: [],
  usagePrimary: "picker <list-command>"
}

/**
 * EN: Service Worker path — usage / UI-only hint.
 * Opening columns requires the BMXt window (`picker tabs -list`).
 * JA: Service Worker 経路 — usage / UI 専用の案内。
 * 列の起動は BMXt ウィンドウ（`picker tabs -list`）が担当する。
 */
export function run(args: string[]) {
  const locale = getRunLocale()
  if (args.length <= 1) {
    return linesDispatch(pickerUsageLines(locale))
  }
  return linesDispatch([
    tCmd("cmd.picker.error.uiOnly", locale),
    ...pickerUsageLines(locale)
  ])
}
