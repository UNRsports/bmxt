import { getRunLocale } from "../../setting/i18n/run-locale"
import { tCmd } from "../../setting/i18n/ns/cmd"
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
    return linesDispatch([tCmd("cmd.group.usage.line", locale)])
  }
  const tabIds = args
    .slice(2)
    .map((s) => Number.parseInt(s, 10))
    .filter((n) => Number.isFinite(n))
  if (tabIds.length === 0) {
    return linesDispatch([
      tCmd("cmd.group.usage.interactive", locale),
      tCmd("cmd.group.usage.nonInteractive", locale)
    ])
  }
  return effectsDispatch([{ kind: "group_new", tab_ids: tabIds }])
}
