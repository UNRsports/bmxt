import { isSecondToken } from "../../builtin-commands/command-subcommands.gen"
import {
  cmdAvailableOptionsLine,
  translateCmdOffLines,
  translateCmdOnLines,
  translateCmdSettingLines,
  translateCmdUsageLines
} from "../../setting/i18n/cmd-lines"
import { getRunLocale } from "../../setting/i18n/run-locale"
import { tCmd } from "../../setting/i18n/ns/cmd"
import type { CmdMeta } from "../types"
import { linesDispatch } from "../types"

export const CMD: CmdMeta = {
  name: "translate",
  aliases: [],
  usagePrimary: "translate -on | translate -off | translate -setting"
}

export function run(args: string[]) {
  const locale = getRunLocale()
  if (!args[1]) {
    return linesDispatch([
      cmdAvailableOptionsLine("translate", locale),
      ...translateCmdUsageLines(locale)
    ])
  }
  const first = args[1]
  if (!isSecondToken("translate", first)) {
    return linesDispatch([
      tCmd("cmd.translate.error.unknownOption", locale, { option: first }),
      ...translateCmdUsageLines(locale)
    ])
  }
  const firstLc = first.toLowerCase()
  if (firstLc === "-on") {
    return linesDispatch(translateCmdOnLines(locale))
  }
  if (firstLc === "-off") {
    return linesDispatch(translateCmdOffLines(locale))
  }
  if (firstLc === "-setting") {
    return linesDispatch(translateCmdSettingLines(locale))
  }
  return linesDispatch([
    tCmd("cmd.translate.error.internal", locale, { option: first }),
    ...translateCmdUsageLines(locale)
  ])
}
