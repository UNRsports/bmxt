import { isSecondToken } from "../../builtin-commands/command-subcommands.gen"
import { stripInvisibleFormatChars } from "../line-parse"
import type { CmdMeta } from "../types"
import { effectsDispatch, linesDispatch } from "../types"

export const CMD: CmdMeta = {
  name: "dom",
  aliases: [],
  usagePrimary: "dom -list [--html|--react] [<pattern>]"
}

function usageLines(): string[] {
  return [
    "usage: dom -list [--html|--react] [<pattern>]   — open DOM picker (default flavor: --html)",
    "EN: -list opens a picker (same chrome as grep -list); flavor pull-down: --html (default) | --react.",
    "JA: -list は picker（grep -list と同じクロム）。flavor プルダウン: --html (default) | --react。",
    "EN: <pattern> is a case-insensitive substring filter on the output lines (no regex).",
    "JA: <pattern> は出力行に対する大文字小文字無視の部分一致フィルタ（正規表現なし）。"
  ]
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
  if (!args[1]) {
    return linesDispatch(["dom: available options", ...usageLines()])
  }
  const first = args[1]
  if (!isSecondToken("dom", first)) {
    return linesDispatch([`error: unknown dom option: ${first}`, ...usageLines()])
  }
  const firstLc = normalizeDomToken(first)
  if (firstLc === "-list") {
    return runList(args)
  }
  return linesDispatch([`error: unknown dom option (internal): ${first}`, ...usageLines()])
}
