import { isSecondToken } from "../../builtin-commands/command-subcommands.gen"
import type { CmdMeta } from "../types"
import { effectsDispatch, linesDispatch } from "../types"

export const CMD: CmdMeta = {
  name: "split",
  aliases: [],
  usagePrimary: "split -col | split -row"
}

function splitUsageLines(): string[] {
  return [
    "usage: split -col   — vertical split (new pane beside current)",
    "       split -row   — horizontal split (new pane below current)",
    "       Ctrl+Arrow   — move keyboard focus between panes when more than one is open"
  ]
}

export function run(args: string[]) {
  if (args.length <= 1) {
    return linesDispatch([
      "split: choose a layout",
      ...splitUsageLines(),
      "Run split alone for this message; the prompt restores to `split ` for Tab completion."
    ])
  }
  const sub = args[1].toLowerCase()
  if (!isSecondToken("split", args[1])) {
    return linesDispatch([`error: unknown split option: ${args[1]}`, ...splitUsageLines()])
  }
  if (args.length > 2) {
    return linesDispatch([
      "error: split takes only one option (-col or -row)",
      ...splitUsageLines()
    ])
  }
  if (sub === "-col") {
    return effectsDispatch([{ kind: "split_col" }])
  }
  if (sub === "-row") {
    return effectsDispatch([{ kind: "split_row" }])
  }
  return linesDispatch(["error: internal: split option out of sync", ...splitUsageLines()])
}
