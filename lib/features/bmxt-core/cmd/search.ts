import { isSecondToken } from "../../builtin-commands/command-subcommands.gen"
import { stripInvisibleFormatChars } from "../line-parse"
import type { ChromeEffect } from "../../dispatch/effect-types"
import type { CmdMeta } from "../types"
import { effectsDispatch, linesDispatch } from "../types"

export const CMD: CmdMeta = {
  name: "search",
  aliases: [],
  usagePrimary: "search -list [--history|--bookmark|--page] <pattern> | search -exit -list"
}

function usageLines(): string[] {
  return [
    "usage: search -list --history|--bookmark|--page [<pattern>]   — open search picker (scope required)",
    "       search -exit -list — close search list picker in this BMXt pane",
    "EN: Pattern is matched as a case-insensitive substring (no regex in v1).",
    "JA: パターンは大文字小文字を区別しない部分一致です（v1 は正規表現なし）。",
    "EN/JA: Optional ASCII double quotes around the pattern are stripped (e.g. search -list --history \"…\")."
  ]
}

function normalizeSearchSecondToken(head: string): string {
  return stripInvisibleFormatChars(head.trim()).toLowerCase()
}

function normalizeSearchPattern(raw: string): string {
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

function isSearchListScopeToken(token: string): boolean {
  const t = token.toLowerCase()
  return t === "--history" || t === "--bookmark" || t === "--page"
}

function dispatchForScope(scope: string, pattern: string) {
  switch (scope) {
    case "--history":
      return effectsDispatch([{ kind: "search_history", pattern }])
    case "--bookmark":
      return effectsDispatch([{ kind: "search_bookmark", pattern }])
    case "--page":
      return effectsDispatch([{ kind: "search_page", pattern }])
    default:
      return linesDispatch([`error: internal: bad search scope (${scope})`, ...usageLines()])
  }
}

function runList(args: string[]) {
  if (args.length < 3) {
    return linesDispatch([
      "error: search -list requires a scope: --history | --bookmark | --page",
      ...usageLines()
    ])
  }
  const scope = normalizeSearchSecondToken(args[2])
  if (!isSearchListScopeToken(scope)) {
    return linesDispatch([`error: unknown search scope: ${args[2]}`, ...usageLines()])
  }
  const patternRaw = args.slice(3).join(" ")
  const pattern = normalizeSearchPattern(patternRaw)
  return dispatchForScope(scope, pattern)
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
