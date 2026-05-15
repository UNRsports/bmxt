import { isSecondToken } from "../../builtin-commands/command-subcommands.gen"
import { stripInvisibleFormatChars } from "../line-parse"
import type { ChromeEffect } from "../../dispatch/effect-types"
import type { CmdMeta } from "../types"
import { effectsDispatch, linesDispatch } from "../types"

export const CMD: CmdMeta = {
  name: "grep",
  aliases: [],
  usagePrimary:
    "grep -list [--none|--history|--bookmark|--page] <pattern> | grep --none|… <pattern>"
}

function usageLines(): string[] {
  return [
    "usage: grep -list [--none|--history|--bookmark|--page] <pattern>   — -list form (default scope: --none)",
    "       grep --none <pattern>   — all scopes (history + bookmark + page); empty pattern = all entries (capped)",
    "       grep --history <pattern>  — recent history titles/URLs",
    "       grep --bookmark <pattern>  — bookmark titles/URLs",
    "       grep --page <pattern>     — visible text in non-discarded http(s) tabs",
    "EN: Pattern is matched as a case-insensitive substring (no regex in v1).",
    "JA: パターンは大文字小文字を区別しない部分一致です（v1 は正規表現なし）。",
    "EN/JA: Optional ASCII double quotes around the pattern are stripped (e.g. grep --history \"…\")."
  ]
}

function normalizeGrepSecondToken(head: string): string {
  return stripInvisibleFormatChars(head.trim()).toLowerCase()
}

function normalizeGrepPattern(raw: string): string {
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

function dispatchForScope(scope: string, pattern: string) {
  switch (scope) {
    case "--none":
      return effectsDispatch([
        { kind: "grep_history", pattern },
        { kind: "grep_bookmark", pattern },
        { kind: "grep_page", pattern }
      ] satisfies ChromeEffect[])
    case "--history":
      return effectsDispatch([{ kind: "grep_history", pattern }])
    case "--bookmark":
      return effectsDispatch([{ kind: "grep_bookmark", pattern }])
    case "--page":
      return effectsDispatch([{ kind: "grep_page", pattern }])
    default:
      return linesDispatch([`error: internal: bad grep scope (${scope})`, ...usageLines()])
  }
}

function runList(args: string[]) {
  if (args.length === 2) {
    return dispatchForScope("--none", "")
  }
  const tok2 = normalizeGrepSecondToken(args[2])
  let scope = "--none"
  let patternStartIdx = 2
  if (
    tok2 === "--none" ||
    tok2 === "--history" ||
    tok2 === "--bookmark" ||
    tok2 === "--page"
  ) {
    scope = tok2
    patternStartIdx = 3
  }
  const patternRaw = args.slice(patternStartIdx).join(" ")
  const pattern = normalizeGrepPattern(patternRaw)
  return dispatchForScope(scope, pattern)
}

export function run(args: string[]) {
  if (!args[1]) {
    return linesDispatch(["grep: available options", ...usageLines()])
  }
  const headRaw = args[1]
  const headKey = normalizeGrepSecondToken(headRaw)
  if (!isSecondToken("grep", headKey)) {
    return linesDispatch([`error: unknown grep option: ${headRaw}`, ...usageLines()])
  }
  if (headKey === "-list") {
    return runList(args)
  }
  const patternRaw = args.slice(2).join(" ")
  const pattern = normalizeGrepPattern(patternRaw)
  return dispatchForScope(headKey, pattern)
}
