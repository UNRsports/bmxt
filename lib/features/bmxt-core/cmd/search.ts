import { isSecondToken } from "../../builtin-commands/command-subcommands.gen"
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

function usageLines(): string[] {
  return [
    "usage: search -list [<pattern>]   — open search picker (history + bookmark + page)",
    "       search -list --history|--bookmark|--page [<pattern>]   — narrow to one scope",
    "       search -exit -list — close search list picker in this BMXt pane",
    "EN: Pattern is matched as a case-insensitive substring (no regex in v1).",
    "JA: パターンは大文字小文字を区別しない部分一致です（v1 は正規表現なし）。",
    "EN/JA: Optional ASCII double quotes around the pattern are stripped (e.g. search -list \"…\")."
  ]
}

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
    return linesDispatch([...usageLines()])
  }
  if (args.length === 2) {
    return linesDispatch([
      "error: search -list requires a pattern or optional scope filter",
      ...usageLines()
    ])
  }
  const third = normalizeSearchSecondToken(args[2])
  if (third.startsWith("--") && !isSearchListScopeToken(third)) {
    return linesDispatch([`error: unknown search scope: ${args[2]}`, ...usageLines()])
  }
  const scopes = isSearchListScopeToken(third) ? [third] : [...ALL_SEARCH_SCOPES]
  const patternStartIdx = isSearchListScopeToken(third) ? 3 : 2
  const pattern = normalizeSearchPattern(args.slice(patternStartIdx).join(" "))
  try {
    return effectsDispatch(scopes.map((scope) => effectForScope(scope, pattern)))
  } catch (e) {
    return linesDispatch([
      `error: ${e instanceof Error ? e.message : String(e)}`,
      ...usageLines()
    ])
  }
}

export function run(args: string[]) {
  if (!args[1]) {
    return linesDispatch(["search: available options", ...usageLines()])
  }
  const headRaw = args[1]
  const headKey = normalizeSearchSecondToken(headRaw)
  if (!isSecondToken("search", headKey)) {
    return linesDispatch([`error: unknown search option: ${headRaw}`, ...usageLines()])
  }
  if (headKey === "-list") {
    return runList(args)
  }
  if (headKey === "-exit") {
    if (args.length !== 3 || normalizeSearchSecondToken(args[2]) !== "-list") {
      return linesDispatch(["error: usage: search -exit -list", ...usageLines()])
    }
    return linesDispatch([
      "Search list picker is closed from the BMXt prompt with:  search -exit -list",
      "EN: Run that line in the BMXt window while the search picker column is open.",
      "JA: search ピッカー列表示中に BMXt プロンプトで実行してください。"
    ])
  }
  return linesDispatch([...usageLines()])
}
