import type { CmdMeta } from "../types"
import { effectsDispatch } from "../types"

export const CMD: CmdMeta = {
  name: "aboutbmxt",
  aliases: [],
  usagePrimary: "aboutbmxt"
}

export function run(_args: string[]) {
  return effectsDispatch([{ kind: "open_welcome_page" }])
}
