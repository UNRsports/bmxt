import { isSecondToken } from "../../builtin-commands/command-subcommands.gen"
import {
  cmdAvailableOptionsLine,
  tabsCmdExitListLines,
  tabsCmdListLines,
  tabsCmdRunHintLine,
  tabsCmdSettingLines,
  tabsCmdUsageLines
} from "../../setting/i18n/cmd-lines"
import { getRunLocale } from "../../setting/i18n/run-locale"
import { t } from "../../setting/i18n/messages"
import { parseHttpUrlCandidate, stripInvisibleFormatChars } from "../line-parse"
import type { CmdMeta } from "../types"
import { effectsDispatch, linesDispatch } from "../types"

export const CMD: CmdMeta = {
  name: "tabs",
  aliases: [],
  usagePrimary:
    "tabs -list [-u] | tabs -exit -list | tabs -setting -page-active | tabs -moveurl <url> | tabs -nowurl"
}

function normTabsFlag(arg: string | undefined): "l" | "e" | "s" | "m" | "n" | null {
  if (!arg) return null
  const a = stripInvisibleFormatChars(arg.trim()).toLowerCase()
  if (a === "-list") return "l"
  if (a === "-exit") return "e"
  if (a === "-setting") return "s"
  if (a === "-moveurl") return "m"
  if (a === "-nowurl") return "n"
  return null
}

export function run(args: string[]) {
  const locale = getRunLocale()
  if (!args[1]) {
    return linesDispatch([cmdAvailableOptionsLine("tabs", locale), ...tabsCmdUsageLines(locale)])
  }
  const first = args[1]
  if (!isSecondToken("tabs", first)) {
    return linesDispatch([
      t("cmd.tabs.error.unknownOption", locale, { option: first }),
      ...tabsCmdUsageLines(locale)
    ])
  }
  const sub = normTabsFlag(args[1])
  if (!sub) {
    return linesDispatch([
      t("cmd.tabs.error.internalOutOfSync", locale),
      ...tabsCmdUsageLines(locale)
    ])
  }
  switch (sub) {
    case "l": {
      if (args.length > 3 || (args.length === 3 && args[2].toLowerCase() !== "-u")) {
        return linesDispatch([
          t("cmd.tabs.error.invalidListUsage", locale),
          ...tabsCmdUsageLines(locale)
        ])
      }
      return linesDispatch(tabsCmdListLines(locale))
    }
    case "e": {
      if (args.length !== 3 || args[2].toLowerCase() !== "-list") {
        return linesDispatch([
          t("cmd.tabs.error.exitListUsage", locale),
          ...tabsCmdUsageLines(locale)
        ])
      }
      return linesDispatch(tabsCmdExitListLines(locale))
    }
    case "s": {
      return linesDispatch(tabsCmdSettingLines(locale))
    }
    case "n": {
      if (args.length > 2) {
        return linesDispatch([
          t("cmd.tabs.error.tooManyArgs", locale),
          ...tabsCmdUsageLines(locale)
        ])
      }
      return effectsDispatch([{ kind: "tabs_nu" }])
    }
    case "m": {
      const urlPart = args.slice(2).join(" ").trim()
      if (!urlPart) {
        return linesDispatch([
          t("cmd.tabs.error.usageMoveurl", locale),
          ...tabsCmdUsageLines(locale)
        ])
      }
      const url = parseHttpUrlCandidate(urlPart)
      if (!url) {
        return linesDispatch([
          t("cmd.tabs.error.usageMoveurl", locale),
          ...tabsCmdUsageLines(locale)
        ])
      }
      return effectsDispatch([{ kind: "tabs_move_url", url }])
    }
    default:
      return linesDispatch([
        t("cmd.tabs.error.internalDispatchOutOfSync", locale),
        ...tabsCmdUsageLines(locale)
      ])
  }
}
