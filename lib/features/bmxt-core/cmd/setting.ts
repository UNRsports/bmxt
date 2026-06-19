import { isSecondToken } from "../../builtin-commands/command-subcommands.gen"
import {
  cmdAvailableOptionsLine,
  settingCmdExitLines,
  settingCmdListLines,
  settingCmdUsageLines
} from "../../setting/i18n/cmd-lines"
import type { CmdMeta } from "../types"
import { linesDispatch } from "../types"

export const CMD: CmdMeta = {
  name: "setting",
  aliases: [],
  usagePrimary: "setting -list | setting -exit -list"
}

export function run(args: string[]) {
  if (!args[1]) {
    return linesDispatch([cmdAvailableOptionsLine("setting"), ...settingCmdUsageLines()])
  }
  const first = args[1]
  if (!isSecondToken("setting", first)) {
    return linesDispatch([`error: unknown setting option: ${first}`, ...settingCmdUsageLines()])
  }
  const firstLc = first.toLowerCase()
  if (firstLc === "-list") {
    return linesDispatch(settingCmdListLines())
  }
  if (firstLc === "-exit") {
    return linesDispatch(settingCmdExitLines())
  }
  return linesDispatch([
    `error: unknown setting option (internal): ${first}`,
    ...settingCmdUsageLines()
  ])
}
