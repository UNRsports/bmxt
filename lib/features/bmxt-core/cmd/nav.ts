import { isSecondToken } from "../../builtin-commands/command-subcommands.gen"
import {
  navCmdEnterLines,
  navCmdExitLines,
  navCmdUsageLines
} from "../../setting/i18n/cmd-lines"
import type { CmdMeta } from "../types"
import { linesDispatch } from "../types"

export const CMD: CmdMeta = {
  name: "nav",
  aliases: [],
  usagePrimary: "nav -enter | nav -exit"
}

export function run(args: string[]) {
  if (!args[1]) {
    return linesDispatch(["nav: available options", ...navCmdUsageLines()])
  }
  const first = args[1]
  if (!isSecondToken("nav", first)) {
    return linesDispatch([`error: unknown nav option: ${first}`, ...navCmdUsageLines()])
  }
  const firstLc = first.toLowerCase()
  if (firstLc === "-enter") {
    return linesDispatch(navCmdEnterLines())
  }
  if (firstLc === "-exit") {
    return linesDispatch(navCmdExitLines())
  }
  return linesDispatch([`error: unknown nav option (internal): ${first}`, ...navCmdUsageLines()])
}
