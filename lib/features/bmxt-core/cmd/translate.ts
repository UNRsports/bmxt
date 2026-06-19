import { isSecondToken } from "../../builtin-commands/command-subcommands.gen"
import {
  cmdAvailableOptionsLine,
  translateCmdOffLines,
  translateCmdOnLines,
  translateCmdSettingLines,
  translateCmdUsageLines
} from "../../setting/i18n/cmd-lines"
import type { CmdMeta } from "../types"
import { linesDispatch } from "../types"

export const CMD: CmdMeta = {
  name: "translate",
  aliases: [],
  usagePrimary: "translate -on | translate -off | translate -setting"
}

export function run(args: string[]) {
  if (!args[1]) {
    return linesDispatch([cmdAvailableOptionsLine("translate"), ...translateCmdUsageLines()])
  }
  const first = args[1]
  if (!isSecondToken("translate", first)) {
    return linesDispatch([`error: unknown translate option: ${first}`, ...translateCmdUsageLines()])
  }
  const firstLc = first.toLowerCase()
  if (firstLc === "-on") {
    return linesDispatch(translateCmdOnLines())
  }
  if (firstLc === "-off") {
    return linesDispatch(translateCmdOffLines())
  }
  if (firstLc === "-setting") {
    return linesDispatch(translateCmdSettingLines())
  }
  return linesDispatch([
    `error: unknown translate option (internal): ${first}`,
    ...translateCmdUsageLines()
  ])
}
