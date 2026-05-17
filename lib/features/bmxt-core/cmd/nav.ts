import { isSecondToken } from "../../builtin-commands/command-subcommands.gen"
import type { CmdMeta } from "../types"
import { linesDispatch } from "../types"

export const CMD: CmdMeta = {
  name: "nav",
  aliases: [],
  usagePrimary: "nav -enter | nav -exit"
}

function usageLines(): string[] {
  return [
    "usage: nav -enter       — arm nav mode in this BMXt pane (Alt on prompt toggles overlay on/off)",
    "       nav -exit        — disarm nav (turn Alt off first)",
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
  return linesDispatch([`error: unknown nav option (internal): ${first}`, ...usageLines()])
}
