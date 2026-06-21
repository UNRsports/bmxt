import { isSecondToken } from "../../builtin-commands/command-subcommands.gen"
import {
  cmdAvailableOptionsLine,
  settingCmdExitLines,
  settingCmdListLines,
  settingCmdUsageLines
} from "../../setting/i18n/cmd-lines"
import { getRunLocale } from "../../setting/i18n/run-locale"
import { t } from "../../setting/i18n/messages"
import type { CmdMeta } from "../types"
import { linesDispatch } from "../types"

export const CMD: CmdMeta = {
  name: "setting",
  aliases: [],
  usagePrimary: "setting -list | setting -exit -list"
}

export function run(args: string[]) {
  const locale = getRunLocale()
  if (!args[1]) {
    return linesDispatch([cmdAvailableOptionsLine("setting", locale), ...settingCmdUsageLines(locale)])
  }
  const first = args[1]
  if (!isSecondToken("setting", first)) {
    return linesDispatch([
      t("cmd.setting.error.unknownOption", locale, { option: first }),
      ...settingCmdUsageLines(locale)
    ])
  }
  const firstLc = first.toLowerCase()
  if (firstLc === "-list") {
    return linesDispatch(settingCmdListLines(locale))
  }
  if (firstLc === "-exit") {
    return linesDispatch(settingCmdExitLines(locale))
  }
  return linesDispatch([
    t("cmd.setting.error.internal", locale, { option: first }),
    ...settingCmdUsageLines(locale)
  ])
}
