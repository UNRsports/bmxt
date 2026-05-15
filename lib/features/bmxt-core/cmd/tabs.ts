import { isSecondToken } from "../../builtin-commands/command-subcommands.gen"
import { parseHttpUrlCandidate, stripInvisibleFormatChars } from "../line-parse"
import type { CmdMeta } from "../types"
import { effectsDispatch, linesDispatch } from "../types"

export const CMD: CmdMeta = {
  name: "tabs",
  aliases: [],
  usagePrimary: "tabs -list [-u]"
}

function tabsUsageLines(): string[] {
  return [
    "usage: tabs -list [-u]   — tab picker (optional -u: show each tab URL)",
    "       tabs -moveurl <url> — go to tab with URL or open new tab (Tab completes URLs in BMXt)",
    "       tabs -nowurl       — show current tab URL"
  ]
}

function tabsRunHintLine(): string {
  return "Run:  tabs -list  or  tabs -list -u  (picker).  tabs -nowurl  (current URL).  tabs -moveurl <url>  (jump or new tab)."
}

function normTabsFlag(arg: string | undefined): "l" | "m" | "n" | null {
  if (!arg) return null
  const a = stripInvisibleFormatChars(arg.trim()).toLowerCase()
  if (a === "-list") return "l"
  if (a === "-moveurl") return "m"
  if (a === "-nowurl") return "n"
  return null
}

export function run(args: string[]) {
  if (!args[1]) {
    return linesDispatch(["tabs: available options", ...tabsUsageLines()])
  }
  const first = args[1]
  if (!isSecondToken("tabs", first)) {
    return linesDispatch([`error: unknown tabs option: ${first}`, ...tabsUsageLines()])
  }
  const sub = normTabsFlag(args[1])
  if (!sub) {
    return linesDispatch([
      "error: internal: tabs option out of sync (re-run npm run codegen)",
      ...tabsUsageLines()
    ])
  }
  switch (sub) {
    case "l": {
      if (args.length > 3 || (args.length === 3 && args[2].toLowerCase() !== "-u")) {
        return linesDispatch(["error: invalid tabs -list usage", ...tabsUsageLines()])
      }
      return linesDispatch([
        "Tab picker is opened from the BMXt prompt with:  tabs -list   or   tabs -list -u",
        tabsRunHintLine()
      ])
    }
    case "n": {
      if (args.length > 2) {
        return linesDispatch(["error: too many arguments", ...tabsUsageLines()])
      }
      return effectsDispatch([{ kind: "tabs_nu" }])
    }
    case "m": {
      const urlPart = args.slice(2).join(" ").trim()
      if (!urlPart) {
        return linesDispatch(["usage: tabs -moveurl <http(s)-url>", ...tabsUsageLines()])
      }
      const url = parseHttpUrlCandidate(urlPart)
      if (!url) {
        return linesDispatch(["usage: tabs -moveurl <http(s)-url>", ...tabsUsageLines()])
      }
      return effectsDispatch([{ kind: "tabs_move_url", url }])
    }
    default:
      return linesDispatch([
        "error: internal: tabs dispatch out of sync",
        ...tabsUsageLines()
      ])
  }
}
