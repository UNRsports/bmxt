import { isSecondToken } from "../../builtin-commands/command-subcommands.gen"
import {
  cmdAvailableOptionsLine,
  domCmdExitListLines,
  domCmdSettingLines,
  domCmdUsageLines
} from "../../setting/i18n/cmd-lines"
import { getRunLocale } from "../../setting/i18n/run-locale"
import { tCmd } from "../../setting/i18n/ns/cmd"
import { parseDomListArgsFromTokens } from "../../dom/parse-dom-list-args"
import { stripInvisibleFormatChars } from "../line-parse"
import type { CmdMeta } from "../types"
import { effectsDispatch, linesDispatch } from "../types"

export const CMD: CmdMeta = {
  name: "dom",
  aliases: [],
  usagePrimary:
    "dom -list [--normal|--with] [--html|--react] [<pattern>] | dom -exit -list | dom -setting -page-active"
}

function normalizeDomToken(tok: string): string {
  return stripInvisibleFormatChars(tok.trim()).toLowerCase()
}

function runList(args: string[]) {
  if (args.length === 2) {
    return effectsDispatch([
      { kind: "dom_list", flavor: "--html", pattern: "", pickerMode: "normal" }
    ])
  }
  const parsed = parseDomListArgsFromTokens(
    args.slice(2).map((a) => stripInvisibleFormatChars(a))
  )
  if (parsed === null) {
    const locale = getRunLocale()
    return linesDispatch([
      tCmd("cmd.dom.error.listUsage", locale),
      ...domCmdUsageLines(locale)
    ])
  }
  return effectsDispatch([
    {
      kind: "dom_list",
      flavor: parsed.flavor,
      pattern: parsed.pattern,
      pickerMode: parsed.pickerMode
    }
  ])
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
  if (firstLc === "-setting") {
    return linesDispatch(domCmdSettingLines(locale))
  }
  return linesDispatch([
    tCmd("cmd.dom.error.internal", locale, { option: first }),
    ...domCmdUsageLines(locale)
  ])
}
