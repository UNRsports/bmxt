import { isSecondToken } from "../../builtin-commands/command-subcommands.gen"
import {
  tabsCmdExitListLines,
  tabsCmdListLines,
  tabsCmdRunHintLine,
  tabsCmdSettingLines,
  tabsCmdUsageLines
} from "../../setting/i18n/cmd-lines"
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
  if (!args[1]) {
    return linesDispatch(["tabs: available options", ...tabsCmdUsageLines()])
  }
  const first = args[1]
  if (!isSecondToken("tabs", first)) {
    return linesDispatch([`error: unknown tabs option: ${first}`, ...tabsCmdUsageLines()])
  }
  const sub = normTabsFlag(args[1])
  if (!sub) {
    return linesDispatch([
      "error: internal: tabs option out of sync (re-run npm run codegen)",
      ...tabsCmdUsageLines()
    ])
  }
  switch (sub) {
    case "l": {
      if (args.length > 3 || (args.length === 3 && args[2].toLowerCase() !== "-u")) {
        return linesDispatch(["error: invalid tabs -list usage", ...tabsCmdUsageLines()])
      }
      return linesDispatch(tabsCmdListLines())
    }
    case "e": {
      if (args.length !== 3 || args[2].toLowerCase() !== "-list") {
        return linesDispatch(["error: usage: tabs -exit -list", ...tabsCmdUsageLines()])
      }
      return linesDispatch(tabsCmdExitListLines())
    }
    case "s": {
      return linesDispatch(tabsCmdSettingLines())
    }
    case "n": {
      if (args.length > 2) {
        return linesDispatch(["error: too many arguments", ...tabsCmdUsageLines()])
      }
      return effectsDispatch([{ kind: "tabs_nu" }])
    }
    case "m": {
      const urlPart = args.slice(2).join(" ").trim()
      if (!urlPart) {
        return linesDispatch(["usage: tabs -moveurl <http(s)-url>", ...tabsCmdUsageLines()])
      }
      const url = parseHttpUrlCandidate(urlPart)
      if (!url) {
        return linesDispatch(["usage: tabs -moveurl <http(s)-url>", ...tabsCmdUsageLines()])
      }
      return effectsDispatch([{ kind: "tabs_move_url", url }])
    }
    default:
      return linesDispatch(["error: internal: tabs dispatch out of sync", ...tabsCmdUsageLines()])
  }
}
