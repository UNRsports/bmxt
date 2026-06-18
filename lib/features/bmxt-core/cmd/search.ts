import { isSecondToken } from "../../builtin-commands/command-subcommands.gen"
import { searchCmdExitListLines, searchCmdUsageLines } from "../../setting/i18n/cmd-lines"
import { normalizeSearchPattern } from "../../search/search-format"
import { stripInvisibleFormatChars } from "../line-parse"
import type { ChromeEffect } from "../../dispatch/effect-types"
import type { CmdMeta } from "../types"
import { effectsDispatch, linesDispatch } from "../types"

export const CMD: CmdMeta = {
  name: "search",
  aliases: [],
  usagePrimary: "search -list [--history|--bookmark|--page] <pattern> | search -exit -list"
}

const ALL_SEARCH_SCOPES = ["--history", "--bookmark", "--page"] as const

function normalizeSearchSecondToken(head: string): string {
  return stripInvisibleFormatChars(head.trim()).toLowerCase()
}

function isSearchListScopeToken(token: string): boolean {
  const t = token.toLowerCase()
  return t === "--history" || t === "--bookmark" || t === "--page"
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

function runList(args: string[]) {
  if (args.length < 2) {
    return linesDispatch([...searchCmdUsageLines()])
  }
  if (args.length === 2) {
    return linesDispatch([
      "error: search -list requires a pattern or optional scope filter",
      ...searchCmdUsageLines()
    ])
  }
  const third = normalizeSearchSecondToken(args[2])
  if (third.startsWith("--") && !isSearchListScopeToken(third)) {
    return linesDispatch([`error: unknown search scope: ${args[2]}`, ...searchCmdUsageLines()])
  }
  const scopes = isSearchListScopeToken(third) ? [third] : [...ALL_SEARCH_SCOPES]
  const patternStartIdx = isSearchListScopeToken(third) ? 3 : 2
  const pattern = normalizeSearchPattern(args.slice(patternStartIdx).join(" "))
  try {
    return effectsDispatch(scopes.map((scope) => effectForScope(scope, pattern)))
  } catch (e) {
    return linesDispatch([
      `error: ${e instanceof Error ? e.message : String(e)}`,
      ...searchCmdUsageLines()
    ])
  }
}

export function run(args: string[]) {
  if (!args[1]) {
    return linesDispatch(["search: available options", ...searchCmdUsageLines()])
  }
  const headRaw = args[1]
  const headKey = normalizeSearchSecondToken(headRaw)
  if (!isSecondToken("search", headKey)) {
    return linesDispatch([`error: unknown search option: ${headRaw}`, ...searchCmdUsageLines()])
  }
  if (headKey === "-list") {
    return runList(args)
  }
  if (headKey === "-exit") {
    if (args.length !== 3 || normalizeSearchSecondToken(args[2]) !== "-list") {
      return linesDispatch(["error: usage: search -exit -list", ...searchCmdUsageLines()])
    }
    return linesDispatch(searchCmdExitListLines())
  }
  return linesDispatch([...searchCmdUsageLines()])
}
