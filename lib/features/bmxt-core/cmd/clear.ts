import type { CmdMeta } from "../types"
import { effectsDispatch } from "../types"

export const CMD: CmdMeta = {
  name: "clear",
  aliases: [],
  usagePrimary: "clear"
}

export function run(_args: string[]) {
  return effectsDispatch([{ kind: "clear_log" }])
}
