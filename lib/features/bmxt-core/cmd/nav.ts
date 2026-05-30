import { isSecondToken } from "../../builtin-commands/command-subcommands.gen"
import type { CmdMeta } from "../types"
import { linesDispatch } from "../types"

export const CMD: CmdMeta = {
  name: "nav",
  aliases: [],
  usagePrimary: "nav -enter | nav -exit | nav -translate -on | nav -translate -off"
}

function usageLines(): string[] {
  return [
    "usage: nav -enter       — arm nav mode in this BMXt pane (Alt on prompt toggles overlay on/off)",
    "       nav -exit        — disarm nav (turn Alt off first)",
    "       nav -translate -on | -off — Chrome built-in Translator while nav typing (ja→en→ja display)",
    "EN: While armed, Alt toggles the page overlay when this pane’s prompt has focus.",
    "JA: 起動後はプロンプトで Alt がオーバーレイ ON/OFF。↑↓←→ で移動、Enter で左クリック相当。"
  ]
}

export function run(args: string[]) {
  if (!args[1]) {
    return linesDispatch([
      "nav: available options",
      ...usageLines()
    ])
  }
  const first = args[1]
  if (!isSecondToken("nav", first)) {
    return linesDispatch([`error: unknown nav option: ${first}`, ...usageLines()])
  }
  const firstLc = first.toLowerCase()
  if (firstLc === "-enter") {
    return linesDispatch([
      "nav -enter — arm from the BMXt prompt",
      "EN: Run `nav -enter` in the BMXt window; then Alt on the command line toggles the page cursor.",
      "JA: BMXt プロンプトで `nav -enter` を実行し、コマンドライン上で Alt でページカーソルを切り替えます。"
    ])
  }
  if (firstLc === "-exit") {
    return linesDispatch([
      "nav -exit — disarm from the BMXt prompt",
      "EN: Turn nav off with Alt first, then run `nav -exit` in this pane.",
      "JA: 先に Alt で nav を OFF にしてから、このペインで `nav -exit` を実行してください。"
    ])
  }
  if (firstLc === "-translate") {
    return linesDispatch([
      "nav -translate — toggle from the BMXt prompt",
      "usage: nav -translate -on | nav -translate -off",
      "EN: When on, nav typing shows ja / EN / back-translation per sentence; Alt-hold commit sends English to the page field.",
      "JA: ON 時、句点で原文・英訳・再訳を表示し、Alt 長押し確定でページへ英訳を送信します（初回はモデル取得あり）。"
    ])
  }
  return linesDispatch([`error: unknown nav option (internal): ${first}`, ...usageLines()])
}
