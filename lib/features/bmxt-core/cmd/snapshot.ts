import { isSecondToken } from "../../builtin-commands/command-subcommands.gen"
import {
  cmdAvailableOptionsLine,
  snapshotCmdSaveLines,
  snapshotCmdUsageLines
} from "../../setting/i18n/cmd-lines"
import { getRunLocale } from "../../setting/i18n/run-locale"
import { tCmd } from "../../setting/i18n/ns/cmd"
import { stripInvisibleFormatChars } from "../line-parse"
import type { CmdMeta } from "../types"
import { linesDispatch } from "../types"

export const CMD: CmdMeta = {
  name: "snapshot",
  aliases: [],
  usagePrimary: "snapshot -save [<tabId>]"
}

function normalizeSnapshotToken(tok: string): string {
  return stripInvisibleFormatChars(tok.trim()).toLowerCase()
}

export function run(args: string[]) {
  const locale = getRunLocale()
  if (!args[1]) {
    return linesDispatch([
      cmdAvailableOptionsLine("snapshot", locale),
      ...snapshotCmdUsageLines(locale)
    ])
  }
  const first = args[1]
  if (!isSecondToken("snapshot", first)) {
    return linesDispatch([
      tCmd("cmd.snapshot.error.unknownOption", locale, { option: first }),
      ...snapshotCmdUsageLines(locale)
    ])
  }
  const firstLc = normalizeSnapshotToken(first)
  if (firstLc === "-save") {
    return linesDispatch(snapshotCmdSaveLines(locale))
  }
  return linesDispatch([
    tCmd("cmd.snapshot.error.internal", locale, { option: first }),
    ...snapshotCmdUsageLines(locale)
  ])
}
