/** Shared command registry metadata for completion and man(1)-style help. */

import { BUILTIN_COMMANDS } from "./commands/builtin"
import type { CommandSpec } from "./commands/types"

const URL_MAN_PAGE: string[] = [
  "NAME",
  "  URL line - open http(s) addresses without a command name",
  "",
  "SYNOPSIS",
  "  https://example.com",
  "  https://example.com .",
  "  https://example.com -nw",
  "",
  "DESCRIPTION",
  "  Bare URL on one line (no spaces in the URL) opens a new tab.",
  "  A trailing space and period ( . ) navigates the current active tab.",
  "  A trailing space and -nw opens a new browser window.",
  "",
  "NOTE",
  "  Current tab uses the same target resolution as back/forward (focused window).",
  "  Only http: and https: schemes are accepted."
]

const COMMAND_MAP = new Map<string, CommandSpec>()
const MAN_PAGES = new Map<string, string[]>()
const ALIAS_TO_TOPIC = new Map<string, string>()

for (const command of BUILTIN_COMMANDS) {
  COMMAND_MAP.set(command.name, command)
  if (command.man) {
    MAN_PAGES.set(command.name, command.man)
  }
  for (const alias of command.aliases ?? []) {
    COMMAND_MAP.set(alias, command)
    if (command.man) {
      ALIAS_TO_TOPIC.set(alias, command.name)
    }
  }
}
MAN_PAGES.set("url", URL_MAN_PAGE)

export const COMPLETION_CANDIDATES: string[] = [...new Set(COMMAND_MAP.keys())].sort()

export function resolveCommand(name: string): CommandSpec | undefined {
  return COMMAND_MAP.get(name.toLowerCase())
}

export function listManTopics(): string[] {
  return [...MAN_PAGES.keys()].sort()
}

export function getManLines(topicRaw: string): string[] | null {
  const key = topicRaw.trim().toLowerCase()
  const direct = MAN_PAGES.get(key)
  if (direct) {
    return [`${key.toUpperCase()}(1)`, ...direct]
  }
  const canon = ALIAS_TO_TOPIC.get(key)
  if (!canon) {
    return null
  }
  const page = MAN_PAGES.get(canon)
  if (!page) {
    return null
  }
  return [`${key.toUpperCase()}(1)  (same as ${canon})`, ...page]
}

export function buildHelpLines(): string[] {
  const names = BUILTIN_COMMANDS.map((c) => c.name).sort()
  const lines = [
    "BMXt - browser command shell",
    ...names.map((name) => {
      const command = COMMAND_MAP.get(name)!
      const aliases = command.aliases?.length ? ` | ${command.aliases.join(" | ")}` : ""
      const usage = command.usage[0] ?? command.name
      return `  ${usage}${aliases}`
    }),
    "  man [topic]  - manual page for a command",
    "",
    "tabs (BMXt window / SW):",
    "  tabs -l [-u]  - tab picker: j/k move, / filter (@... URL), Enter page, Esc exit.",
    "  tabs -nu        - print current tab URL   tabs -mu <url>  - jump to URL tab or open new tab",
    "",
    "URL (http/https, typed as a whole line):",
    "  <url>           - new tab",
    "  <url> .         - current tab (active tab in focused window)",
    "  <url> -nw       - new window",
    "",
    "BMXt window keys:",
    "  One terminal view (output then prompt); focus the window to type.",
    "  left/right/home/end  move cursor in the current line.",
    "  Tab  command completion (repeat to cycle matches).",
    "  up/down  command history   Ctrl+R  reverse-i-search (again: older match)",
    "  Enter  run or accept search   Esc  cancel search"
  ]
  return lines
}
