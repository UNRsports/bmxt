import { getRunLocale } from "../../setting/i18n/run-locale"
import { t } from "../../setting/i18n/messages"
import type { CmdMeta } from "../types"
import { effectsDispatch, linesDispatch } from "../types"

export const CMD: CmdMeta = {
  name: "close",
  aliases: ["c"],
  usagePrimary: "close <tabId>"
}

export function run(args: string[]) {
  const locale = getRunLocale()
  const id = Number.parseInt(args[1] ?? "", 10)
  if (!Number.isFinite(id)) {
    return linesDispatch([t("cmd.close.usage", locale)])
  }
  return effectsDispatch([{ kind: "close_tab", tab_id: id }])
}
