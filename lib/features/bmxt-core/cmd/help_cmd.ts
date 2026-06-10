import { DEFAULT_UI_LOCALE } from "../../setting/locale"
import type { CmdMeta } from "../types"
import { linesDispatch } from "../types"
import { buildHelpLines } from "../registry"

export const CMD: CmdMeta = {
  name: "help",
  aliases: ["?"],
  usagePrimary: "help"
}

export function run(_args: string[]) {
  return linesDispatch(buildHelpLines(DEFAULT_UI_LOCALE))
}
