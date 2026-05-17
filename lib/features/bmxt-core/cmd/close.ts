import type { CmdMeta } from "../types"
import { effectsDispatch, linesDispatch } from "../types"

export const CMD: CmdMeta = {
  name: "close",
  aliases: ["c"],
  usagePrimary: "close <tabId>"
}

export function run(args: string[]) {
  const id = Number.parseInt(args[1] ?? "", 10)
  if (!Number.isFinite(id)) {
    return linesDispatch(["usage: close <tabId>"])
  }
  return effectsDispatch([{ kind: "close_tab", tab_id: id }])
}
