import type { CmdMeta } from "../types"
import { linesDispatch } from "../types"
import { getRunLocale } from "../../setting/i18n/run-locale"
import { tCmd } from "../../setting/i18n/ns/cmd"
import { browseUsageLines } from "../../picker/usage"

export const CMD: CmdMeta = {
  name: "browse",
  aliases: [],
  usagePrimary: "browse <list-command>"
}

/**
 * EN: Service Worker path — usage / UI-only hint.
 * Opening columns requires the BMXt window (`browse tabs -list`).
 * JA: Service Worker 経路 — usage / UI 専用の案内。
 * 列の起動は BMXt ウィンドウ（`browse tabs -list`）が担当する。
 */
export function run(args: string[]) {
  const locale = getRunLocale()
  if (args.length <= 1) {
    return linesDispatch(browseUsageLines(locale))
  }
  return linesDispatch([
    tCmd("cmd.browse.error.uiOnly", locale),
    ...browseUsageLines(locale)
  ])
}
