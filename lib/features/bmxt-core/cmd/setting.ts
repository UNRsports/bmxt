import { isSecondToken } from "../../builtin-commands/command-subcommands.gen"
import type { CmdMeta } from "../types"
import { linesDispatch } from "../types"

export const CMD: CmdMeta = {
  name: "setting",
  aliases: [],
  usagePrimary: "setting -language | setting -appearance"
}

function usageLines(): string[] {
  return [
    "usage: setting -language --japanese | --english  — UI display language (saved)",
    "       setting -appearance --fg #rrggbb           — text color (hex)",
    "       setting -appearance --bg-color #rrggbb     — background color (hex)",
    "       setting -appearance --size 12px              — font size (8–32px)",
    "       setting -appearance --font <family>        — font-family stack",
    "       setting -appearance --bg-import              — pick PNG/JPEG/WebP (512 KiB max)",
    "       setting -appearance --bg-clear               — remove background image",
    "       setting -appearance --reset-default          — restore default appearance (text, bg, font, image)"
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
  if (firstLc === "-language") {
    return linesDispatch([
      "setting -language — run from the BMXt prompt",
      "EN: `setting -language --japanese` or `--english` (Tab completes third token).",
      "JA: 第三トークンに `--japanese` / `--english` を指定して UI 表示言語を保存します。"
    ])
  }
  if (firstLc === "-appearance") {
    return linesDispatch([
      "setting -appearance — run from the BMXt prompt",
      "EN: Colors accept hex only (#rgb / #rrggbb). `--bg-import` opens a file picker (512 KiB max).",
      "JA: 色は #hex のみ。`--bg-import` で背景画像を取り込み（512 KiB 上限）。"
    ])
  }
  return linesDispatch([`error: unknown setting option (internal): ${first}`, ...usageLines()])
}
