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
    "usage: translate -on   — enable translation assist (nav typing preview under prompt)",
    "       translate -off  — disable translation assist",
    "       translate -setting --ja-en | --en-ja  — set translation pair (saved)",
    "EN: `-on` enables assist only; nav typing shows a 訳 preview under the prompt; Alt-hold commit sends the pair target language.",
    "JA: `-on` でアシストを有効化。nav typing 時はプロンプト下に訳プレビュー。`-setting` で `--ja-en` / `--en-ja` を選べます。"
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
      "EN: Enables translation assist; nav typing shows preview under the prompt.",
      "JA: 翻訳アシストを有効化。nav typing 時はプロンプト下に訳を表示します。"
    ])
  }
  if (firstLc === "-off") {
    return linesDispatch([
      "translate -off — run from the BMXt prompt",
      "EN: Disables translation assist.",
      "JA: 翻訳アシストを OFF にします。"
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
