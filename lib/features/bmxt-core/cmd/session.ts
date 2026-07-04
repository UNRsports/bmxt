import { isSecondToken } from "../../builtin-commands/command-subcommands.gen"
import {
  MAX_SESSION_NAME_LEN,
  sanitizeSessionName
} from "../../session/session-summary"
import {
  cmdAvailableOptionsLine,
  sessionCmdRunHintLine,
  sessionCmdSettingNameUiLines,
  sessionCmdSwitchUiLines,
  sessionCmdUsageLines
} from "../../setting/i18n/cmd-lines"
import { getRunLocale } from "../../setting/i18n/run-locale"
import { tCmd } from "../../setting/i18n/ns/cmd"
import type { CmdMeta } from "../types"
import { effectsDispatch, linesDispatch } from "../types"

export const CMD: CmdMeta = {
  name: "session",
  aliases: [],
  usagePrimary:
    "session -new [name] | session -list | session -switch [name] | session -next | session -prev | session -setting-name [name]"
}

function usageLines(): string[] {
  return sessionCmdUsageLines()
}

export function run(args: string[]) {
  const locale = getRunLocale()
  if (args.length <= 1) {
    return linesDispatch([
      cmdAvailableOptionsLine("session", locale),
      ...usageLines(),
      sessionCmdRunHintLine(locale)
    ])
  }
  const sub = args[1].toLowerCase()
  if (!isSecondToken("session", args[1])) {
    return linesDispatch([
      tCmd("cmd.session.error.unknownOption", locale, { option: args[1] }),
      ...usageLines()
    ])
  }
  if (sub === "-new") {
    const rawName = args.slice(2).join(" ").trim()
    if (rawName.length > MAX_SESSION_NAME_LEN) {
      return linesDispatch([
        tCmd("cmd.session.error.nameTooLong", locale, { max: MAX_SESSION_NAME_LEN }),
        ...usageLines()
      ])
    }
    if (rawName.length > 0 && sanitizeSessionName(rawName) === null) {
      return linesDispatch([tCmd("cmd.session.error.invalidName", locale), ...usageLines()])
    }
    return effectsDispatch([{ kind: "session_new", name: rawName }])
  }
  if (sub === "-setting-name" || sub === "-switch") {
    const rawName = args.slice(2).join(" ").trim()
    if (rawName.length > MAX_SESSION_NAME_LEN) {
      return linesDispatch([
        tCmd("cmd.session.error.nameTooLong", locale, { max: MAX_SESSION_NAME_LEN }),
        ...usageLines()
      ])
    }
    if (rawName.length > 0 && sanitizeSessionName(rawName) === null) {
      return linesDispatch([tCmd("cmd.session.error.invalidName", locale), ...usageLines()])
    }
    if (sub === "-setting-name") {
      return linesDispatch(sessionCmdSettingNameUiLines(locale))
    }
    return linesDispatch(sessionCmdSwitchUiLines(locale))
  }
  if (args.length > 2) {
    return linesDispatch([tCmd("cmd.session.error.tooManyArgs", locale), ...usageLines()])
  }
  if (sub === "-next") {
    return effectsDispatch([{ kind: "session_next" }])
  }
  if (sub === "-prev") {
    return effectsDispatch([{ kind: "session_prev" }])
  }
  if (sub === "-list") {
    return linesDispatch([
      tCmd("cmd.session.listPlain.hint", locale),
      sessionCmdRunHintLine(locale)
    ])
  }
  return linesDispatch([tCmd("cmd.session.error.internal", locale), ...usageLines()])
}
