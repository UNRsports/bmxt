import { isSecondToken } from "../../builtin-commands/command-subcommands.gen"
import type { CmdMeta } from "../types"
import { linesDispatch } from "../types"

export const CMD: CmdMeta = {
  name: "translate",
  aliases: [],
  usagePrimary: "translate -on | translate -off | translate -setting"
}

function usageLines(): string[] {
  return [
    "usage: translate -on   — open translate editor picker (原文 / 訳)",
    "       translate -off  — close editor and disable translate assist",
    "       translate -setting --ja-en | --en-ja  — set translation pair (saved)",
    "EN: `-on` opens the side editor column and moves focus there (long-form input).",
    "EN: While enabled, nav typing shows a 訳 preview under the prompt (source = prompt input); Alt-hold commit sends the pair target language.",
    "JA: `-on` で右列エディタを開きフォーカスを移します。`-setting` で `--ja-en` / `--en-ja` を選べます。"
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
  if (firstLc === "-setting") {
    return linesDispatch([
      "translate -setting — run from the BMXt prompt",
      "EN: `translate -setting --ja-en` or `translate -setting --en-ja` (Tab completes third token).",
      "JA: 第三トークンに `--ja-en` / `--en-ja` を指定して翻訳ペアを保存します。"
    ])
  }
  return linesDispatch([`error: unknown translate option (internal): ${first}`, ...usageLines()])
}
