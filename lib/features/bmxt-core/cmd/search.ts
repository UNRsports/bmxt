import { isSecondToken } from "../../builtin-commands/command-subcommands.gen"
import { searchCmdExitListLines, searchCmdUsageLines, cmdAvailableOptionsLine } from "../../setting/i18n/cmd-lines"
import { getRunLocale } from "../../setting/i18n/run-locale"
import { tCmd } from "../../setting/i18n/ns/cmd"
import {
  isSearchListScopeToken,
  normalizeSearchListDispatchLine,
  searchListDefaultEffectScopes,
  searchListEffectScopesForToken
} from "../../search/search-list-picker-parse"
import { normalizeSearchPattern } from "../../search/search-format"
import { stripInvisibleFormatChars } from "../line-parse"
import type { ChromeEffect } from "../../dispatch/effect-types"
import type { CmdMeta } from "../types"
import { effectsDispatch, linesDispatch } from "../types"

export const CMD: CmdMeta = {
  name: "search",
  aliases: [],
  usagePrimary: "search -list [--all|--history|--bookmark|--page] [<pattern>] | search -exit -list"
}

function normalizeSearchSecondToken(head: string): string {
  return stripInvisibleFormatChars(head.trim()).toLowerCase()
}

function effectForScope(scope: string, pattern: string): ChromeEffect {
  switch (scope) {
    case "--history":
      return { kind: "search_history", pattern }
    case "--bookmark":
      return { kind: "search_bookmark", pattern }
    case "--page":
      return { kind: "search_page", pattern }
    default:
      throw new Error(`bad search scope (${scope})`)
  }
}

function runList(args: string[], locale: ReturnType<typeof getRunLocale>) {
  if (args.length < 2) {
    return linesDispatch([...searchCmdUsageLines(locale)])
  }
  if (args.length === 2) {
    const pattern = ""
    return effectsDispatch(
      searchListDefaultEffectScopes().map((scope) => effectForScope(scope, pattern))
    )
  }
  const third = normalizeSearchSecondToken(args[2])
  if (third.startsWith("--") && !isSearchListScopeToken(third)) {
    return linesDispatch([
      tCmd("cmd.search.error.unknownScope", locale, { scope: args[2] }),
      ...searchCmdUsageLines(locale)
    ])
  }
  const hasScopeToken = isSearchListScopeToken(third)
  const scopes = hasScopeToken
    ? searchListEffectScopesForToken(third)
    : searchListDefaultEffectScopes()
  const patternStartIdx = hasScopeToken ? 3 : 2
  const pattern = normalizeSearchPattern(args.slice(patternStartIdx).join(" "))
  try {
    return effectsDispatch(scopes.map((scope) => effectForScope(scope, pattern)))
  } catch (e) {
    return linesDispatch([
      tCmd("cmd.search.error.generic", locale, {
        message: e instanceof Error ? e.message : String(e)
      }),
      ...searchCmdUsageLines(locale)
    ])
  }
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
