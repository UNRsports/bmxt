import { getRunLocale } from "../../setting/i18n/run-locale"
import { t } from "../../setting/i18n/messages"
import type { CmdMeta } from "../types"
import { effectsDispatch, linesDispatch } from "../types"

export const CMD: CmdMeta = {
  name: "group",
  aliases: [],
  usagePrimary: "group new"
}

export function run(args: string[]) {
  const locale = getRunLocale()
  if (args[1]?.toLowerCase() !== "new") {
    return linesDispatch([t("cmd.group.usage.line", locale)])
  }
  const tabIds = args
    .slice(2)
    .map((s) => Number.parseInt(s, 10))
    .filter((n) => Number.isFinite(n))
  if (tabIds.length === 0) {
    return linesDispatch([
      t("cmd.group.usage.interactive", locale),
      t("cmd.group.usage.nonInteractive", locale)
    ])
  }
  return effectsDispatch([{ kind: "group_new", tab_ids: tabIds }])
}
