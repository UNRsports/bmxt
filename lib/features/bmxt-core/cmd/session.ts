import { isSecondToken } from "../../builtin-commands/command-subcommands.gen"
import type { CmdMeta } from "../types"
import { effectsDispatch, linesDispatch } from "../types"

export const CMD: CmdMeta = {
  name: "session",
  aliases: [],
  usagePrimary: "session -new | session -list | session -next | session -prev"
}

function sessionUsageLines(): string[] {
  return [
    "usage: session -new   — new session (switch to it)",
    "       session -list  — list sessions and open picker",
    "       session -next  — next session",
    "       session -prev  — previous session",
    "       Ctrl+Arrow     — prev / next when multiple sessions exist"
  ]
}

export function run(args: string[]) {
  if (args.length <= 1) {
    return linesDispatch([
      "session: choose an option",
      ...sessionUsageLines(),
      "Run session alone for this message; the prompt restores to `session ` for Tab completion."
    ])
  }
  const sub = args[1].toLowerCase()
  if (!isSecondToken("session", args[1])) {
    return linesDispatch([`error: unknown session option: ${args[1]}`, ...sessionUsageLines()])
  }
  if (args.length > 2) {
    return linesDispatch([
      "error: session takes only one option (-new | -list | -next | -prev)",
      ...sessionUsageLines()
    ])
  }
  if (sub === "-new") {
    return effectsDispatch([{ kind: "session_new" }])
  }
  if (sub === "-next") {
    return effectsDispatch([{ kind: "session_next" }])
  }
  if (sub === "-prev") {
    return effectsDispatch([{ kind: "session_prev" }])
  }
  if (sub === "-list") {
    return linesDispatch([
      "`session -list` is handled in the BMXt window UI.",
      "Run it from the prompt in a BMXt terminal pane."
    ])
  }
  return linesDispatch(["error: internal: session option out of sync", ...sessionUsageLines()])
}
