import type { CmdMeta } from "../types"
import { effectsDispatch } from "../types"

export const CMD: CmdMeta = {
  name: "exit",
  aliases: [],
  usagePrimary: "exit"
}

export function run(_args: string[]) {
  return effectsDispatch([{ kind: "exit_pane" }])
}
