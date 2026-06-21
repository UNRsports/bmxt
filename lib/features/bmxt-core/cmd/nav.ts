import { isSecondToken } from "../../builtin-commands/command-subcommands.gen"
import {
  cmdAvailableOptionsLine,
  navCmdEnterLines,
  navCmdExitLines,
  navCmdUsageLines
} from "../../setting/i18n/cmd-lines"
import { getRunLocale } from "../../setting/i18n/run-locale"
import { t } from "../../setting/i18n/messages"
import type { CmdMeta } from "../types"
import { linesDispatch } from "../types"

export const CMD: CmdMeta = {
  name: "nav",
  aliases: [],
  usagePrimary: "nav -enter | nav -exit"
}

export function run(args: string[]) {
  const locale = getRunLocale()
  if (!args[1]) {
    return linesDispatch([cmdAvailableOptionsLine("nav", locale), ...navCmdUsageLines(locale)])
  }
  const first = args[1]
  if (!isSecondToken("nav", first)) {
    return linesDispatch([
      t("cmd.nav.error.unknownOption", locale, { option: first }),
      ...navCmdUsageLines(locale)
    ])
  }
  const firstLc = first.toLowerCase()
  if (firstLc === "-enter") {
    return linesDispatch(navCmdEnterLines(locale))
  }
  if (firstLc === "-exit") {
    return linesDispatch(navCmdExitLines(locale))
  }
  return linesDispatch([
    t("cmd.nav.error.internal", locale, { option: first }),
    ...navCmdUsageLines(locale)
  ])
}
