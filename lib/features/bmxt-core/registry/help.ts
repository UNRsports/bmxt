import { t, type MessageKey } from "../../setting/i18n/messages"
import type { UiLocale } from "../../setting/locale"
import { COMMANDS, cmdByName } from "./table.gen"

const HELP_SECTION_KEYS: readonly MessageKey[] = [
  "help.section.tabs",
  "help.section.session",
  "help.section.dom",
  "help.section.translate",
  "help.section.setting",
  "help.section.search",
  "help.section.url",
  "help.section.keys"
]

function appendSection(lines: string[], key: MessageKey, locale: UiLocale): void {
  const block = t(key, locale)
  if (block.length === 0) {
    return
  }
  lines.push(...block.split("\n"))
}

export function buildHelpLines(locale: UiLocale): string[] {
  const names = [...COMMANDS.map((c) => c.name)].sort()
  const lines: string[] = [
    t("help.title", locale),
    t("help.quickStart", locale),
    "",
    t("help.builtInCommandsHeader", locale)
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
