import type { CmdMeta } from "../types"
import { effectsDispatch, linesDispatch } from "../types"

export const CMD: CmdMeta = {
  name: "group",
  aliases: [],
  usagePrimary: "group new"
}

export function run(args: string[]) {
  if (args[1]?.toLowerCase() !== "new") {
    return linesDispatch(["usage: group new | group new <tabId> [tabId ...]"])
  }
  const tabIds = args
    .slice(2)
    .map((s) => Number.parseInt(s, 10))
    .filter((n) => Number.isFinite(n))
  if (tabIds.length === 0) {
    return linesDispatch([
      "Interactive: in BMXt type  group new  and Enter (no tab ids).",
      "Non-interactive: group new <tabId> [tabId ...]"
    ])
  }
  return effectsDispatch([{ kind: "group_new", tab_ids: tabIds }])
}
