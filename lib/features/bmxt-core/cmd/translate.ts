import { isSecondToken } from "../../builtin-commands/command-subcommands.gen"
import type { CmdMeta } from "../types"
import { linesDispatch } from "../types"

export const CMD: CmdMeta = {
  name: "translate",
  aliases: [],
  usagePrimary: "translate -on | translate -off"
}

function usageLines(): string[] {
  return [
    "usage: translate -on   — open translate editor picker (ja→en→ja per sentence)",
    "       translate -off  — close editor and disable translate assist",
    "EN: `-on` opens the side editor column and moves focus there (long-form input).",
    "EN: While enabled, nav typing also shows translation preview and sends English on Alt-hold commit.",
    "JA: `-on` で右列エディタを開きフォーカスを移します。nav typing 中も翻訳プレビューが有効です。"
  ]
}

export function run(args: string[]) {
  if (!args[1]) {
    return linesDispatch(["translate: available options", ...usageLines()])
  }
  const first = args[1]
  if (!isSecondToken("translate", first)) {
    return linesDispatch([`error: unknown translate option: ${first}`, ...usageLines()])
  }
  const firstLc = first.toLowerCase()
  if (firstLc === "-on") {
    return linesDispatch([
      "translate -on — run from the BMXt prompt",
      "EN: Opens the translate editor picker and moves keyboard focus to the column.",
      "JA: 翻訳エディタ列を開き、キーボードフォーカスを移します。"
    ])
  }
  if (firstLc === "-off") {
    return linesDispatch([
      "translate -off — run from the BMXt prompt",
      "EN: Closes the translate editor picker and disables translation assist.",
      "JA: 翻訳エディタ列を閉じ、翻訳アシストを OFF にします。"
    ])
  }
  return linesDispatch([`error: unknown translate option (internal): ${first}`, ...usageLines()])
}
