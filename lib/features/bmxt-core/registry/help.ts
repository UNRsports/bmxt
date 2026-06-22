import { tHelp, type HelpMessageKey } from "../../setting/i18n/ns/help"
import type { UiLocale } from "../../setting/locale"
import { COMMANDS, cmdByName } from "./table.gen"

const HELP_SECTION_KEYS: readonly HelpMessageKey[] = [
  "help.section.tabs",
  "help.section.session",
  "help.section.dom",
  "help.section.translate",
  "help.section.setting",
  "help.section.search",
  "help.section.url",
  "help.section.keys"
]

function appendSection(lines: string[], key: HelpMessageKey, locale: UiLocale): void {
  const block = tHelp(key, locale)
  if (block.length === 0) {
    return
  }
  lines.push(...block.split("\n"))
}

export function buildHelpLines(locale: UiLocale): string[] {
  const names = [...COMMANDS.map((c) => c.name)].sort()
  const lines: string[] = [
    tHelp("help.title", locale),
    tHelp("help.quickStart", locale),
    "",
    tHelp("help.builtInCommandsHeader", locale)
  ]
  for (const name of names) {
    const cmd = cmdByName(name)
    if (!cmd) {
      continue
    }
    const aliases = cmd.aliases.length > 0 ? ` | ${cmd.aliases.join(" | ")}` : ""
    lines.push(`  ${cmd.usagePrimary}${aliases}`)
  }
  for (const key of HELP_SECTION_KEYS) {
    lines.push("")
    appendSection(lines, key, locale)
  }
  return lines
}
