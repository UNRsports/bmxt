import { isSecondToken } from "../../builtin-commands/command-subcommands.gen"
import type { CmdMeta } from "../types"
import { linesDispatch } from "../types"

export const CMD: CmdMeta = {
  name: "setting",
  aliases: [],
  usagePrimary: "setting -list | setting -exit -list"
}

function usageLines(): string[] {
  return [
    "usage: setting -list       — open settings picker (locale, appearance, export/import)",
    "       setting -exit -list — close settings picker in this BMXt pane"
  ]
}

export function run(args: string[]) {
  if (!args[1]) {
    return linesDispatch(["setting: available options", ...usageLines()])
  }
  const first = args[1]
  if (!isSecondToken("setting", first)) {
    return linesDispatch([`error: unknown setting option: ${first}`, ...usageLines()])
  }
  const firstLc = first.toLowerCase()
  if (firstLc === "-list") {
    return linesDispatch([
      "setting -list — run from the BMXt prompt",
      "EN: Opens the settings picker column (↑↓ · Enter · Esc → prompt).",
      "JA: 設定ピッカー列を開きます（↑↓ · Enter · Esc → プロンプト）。"
    ])
  }
  if (firstLc === "-exit") {
    return linesDispatch([
      "setting -exit -list — run from the BMXt prompt",
      "EN: Closes the settings picker in this pane.",
      "JA: このペインの設定ピッカーを閉じます。"
    ])
  }
  return linesDispatch([`error: unknown setting option (internal): ${first}`, ...usageLines()])
}
