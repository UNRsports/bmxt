import { isSecondToken } from "../../builtin-commands/command-subcommands.gen"
import { domCmdExitListLines, domCmdUsageLines, cmdAvailableOptionsLine } from "../../setting/i18n/cmd-lines"
import { getRunLocale } from "../../setting/i18n/run-locale"
import { tCmd } from "../../setting/i18n/ns/cmd"
import { stripInvisibleFormatChars } from "../line-parse"
import type { CmdMeta } from "../types"
import { effectsDispatch, linesDispatch } from "../types"

export const CMD: CmdMeta = {
  name: "dom",
  aliases: [],
  usagePrimary: "dom -list [--html|--react] [<pattern>] | dom -exit -list"
}

function normalizeDomToken(tok: string): string {
  return stripInvisibleFormatChars(tok.trim()).toLowerCase()
}

function normalizeDomPattern(raw: string): string {
  const t = stripInvisibleFormatChars(raw.trim())
  const chs = [...t]
  if (chs.length >= 2) {
    const a = chs[0]
    const b = chs[chs.length - 1]
    if ((a === '"' && b === '"') || (a === "'" && b === "'")) {
      return stripInvisibleFormatChars(chs.slice(1, -1).join("").trim())
    }
  }
  return t
}

function runList(args: string[]) {
  if (args.length === 2) {
    return effectsDispatch([{ kind: "dom_list", flavor: "--html", pattern: "" }])
  }
  const tok2 = normalizeDomToken(args[2])
  let flavor = "--html"
  let patternStartIdx = 2
  if (tok2 === "--html" || tok2 === "--react") {
    flavor = tok2
    patternStartIdx = 3
  }
  const patternRaw = args.slice(patternStartIdx).join(" ")
  const pattern = normalizeDomPattern(patternRaw)
  return effectsDispatch([{ kind: "dom_list", flavor, pattern }])
}

export function run(args: string[]) {
  const locale = getRunLocale()
  if (!args[1]) {
    return linesDispatch([cmdAvailableOptionsLine("dom", locale), ...domCmdUsageLines(locale)])
  }
  const first = args[1]
  if (!isSecondToken("dom", first)) {
    return linesDispatch([
      tCmd("cmd.dom.error.unknownOption", locale, { option: first }),
      ...domCmdUsageLines(locale)
    ])
  }
  const firstLc = normalizeDomToken(first)
  if (firstLc === "-list") {
    return runList(args)
  }
  if (firstLc === "-exit") {
    if (args.length !== 3 || normalizeDomToken(args[2]) !== "-list") {
      return linesDispatch([
        tCmd("cmd.dom.error.exitListUsage", locale),
        ...domCmdUsageLines(locale)
      ])
    }
    return linesDispatch(domCmdExitListLines(locale))
  }
  return linesDispatch([
    tCmd("cmd.dom.error.internal", locale, { option: first }),
    ...domCmdUsageLines(locale)
  ])
}
