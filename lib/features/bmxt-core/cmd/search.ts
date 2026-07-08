import { isSecondToken } from "../../builtin-commands/command-subcommands.gen"
import { searchCmdExitListLines, searchCmdUsageLines, cmdAvailableOptionsLine } from "../../setting/i18n/cmd-lines"
import { getRunLocale } from "../../setting/i18n/run-locale"
import { tCmd } from "../../setting/i18n/ns/cmd"
import { parseSearchListLine } from "../../search/search-list-parse"
import { stripInvisibleFormatChars } from "../line-parse"
import type { CmdMeta } from "../types"
import { effectsDispatch, linesDispatch } from "../types"

export const CMD: CmdMeta = {
  name: "search",
  aliases: [],
  usagePrimary: "search -list [--all|--history|--bookmark|--page|--snapshot] [--unlimit] [<pattern>] | search -exit -list"
}

function normalizeSearchSecondToken(head: string): string {
  return stripInvisibleFormatChars(head.trim()).toLowerCase()
}

function runList(args: string[], locale: ReturnType<typeof getRunLocale>) {
  const line = args.join(" ")
  const parsed = parseSearchListLine(line)
  if (parsed === null) {
    return linesDispatch([...searchCmdUsageLines(locale)])
  }
  return effectsDispatch([{ kind: "search_list", dispatch_line: parsed.dispatchLine }])
}

export function run(args: string[]) {
  const locale = getRunLocale()
  if (!args[1]) {
    return linesDispatch([cmdAvailableOptionsLine("search", locale), ...searchCmdUsageLines(locale)])
  }
  const headRaw = args[1]
  const headKey = normalizeSearchSecondToken(headRaw)
  if (!isSecondToken("search", headKey)) {
    return linesDispatch([
      tCmd("cmd.search.error.unknownOption", locale, { option: headRaw }),
      ...searchCmdUsageLines(locale)
    ])
  }
  if (headKey === "-list") {
    return runList(args, locale)
  }
  if (headKey === "-exit") {
    if (args.length !== 3 || normalizeSearchSecondToken(args[2]) !== "-list") {
      return linesDispatch([
        tCmd("cmd.search.error.exitListUsage", locale),
        ...searchCmdUsageLines(locale)
      ])
    }
    return linesDispatch(searchCmdExitListLines(locale))
  }
  return linesDispatch([...searchCmdUsageLines(locale)])
}
