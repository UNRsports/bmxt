import { isSecondToken } from "../../builtin-commands/command-subcommands.gen"
import {
  MAX_SESSION_NAME_LEN,
  sanitizeSessionName
} from "../../session/session-summary"
import type { CmdMeta } from "../types"
import { effectsDispatch, linesDispatch } from "../types"

export const CMD: CmdMeta = {
  name: "session",
  aliases: [],
  usagePrimary:
    "session -new [name] | session -list | session -next | session -prev | session -setting-name [name]"
}

function sessionUsageLines(): string[] {
  return [
    "usage: session                    — choose a second token (Tab or Enter menu)",
    "       session <n>               — switch to session number n (1-based)",
    "       session -list             — open switch list (↑↓ · Enter · 1–9)",
    "       session -new [name]       — new session (switch to it); optional display name",
    "       session -setting-name [name] — rename this session (prompt pre-fills current name)",
    "       session -next             — next session",
    "       session -prev             — previous session",
    "       Ctrl+Arrow                — prev / next when multiple sessions exist"
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
  if (sub === "-new") {
    const rawName = args.slice(2).join(" ").trim()
    if (rawName.length > MAX_SESSION_NAME_LEN) {
      return linesDispatch([
        `error: session name too long (max ${MAX_SESSION_NAME_LEN} characters)`,
        ...sessionUsageLines()
      ])
    }
    if (rawName.length > 0 && sanitizeSessionName(rawName) === null) {
      return linesDispatch([
        "error: invalid session name (no control characters or newlines)",
        ...sessionUsageLines()
      ])
    }
    return effectsDispatch([{ kind: "session_new", name: rawName }])
  }
  if (sub === "-setting-name") {
    const rawName = args.slice(2).join(" ").trim()
    if (rawName.length > MAX_SESSION_NAME_LEN) {
      return linesDispatch([
        `error: session name too long (max ${MAX_SESSION_NAME_LEN} characters)`,
        ...sessionUsageLines()
      ])
    }
    if (rawName.length > 0 && sanitizeSessionName(rawName) === null) {
      return linesDispatch([
        "error: invalid session name (no control characters or newlines)",
        ...sessionUsageLines()
      ])
    }
    return linesDispatch([
      "`session -setting-name` is handled in the BMXt window UI.",
      "Run it from the prompt in a BMXt terminal pane."
    ])
  }
  if (args.length > 2) {
    return linesDispatch([
      "error: session takes only one option (-new | -list | -next | -prev | -setting-name)",
      ...sessionUsageLines()
    ])
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
