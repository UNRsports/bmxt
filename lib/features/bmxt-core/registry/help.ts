import { expandDispatchMsgs } from "../expand-msgs"
import type { UiLocale } from "../../setting/locale"

/** EN: Full help lines — keys chosen in Rust; host only expands (ShowHelp fallback). */
export function buildHelpLines(locale: UiLocale): string[] {
  return expandDispatchMsgs(
    [
      { key: "help.title" },
      { key: "help.quickStart" },
      { key: "help.spacer" },
      { key: "help.builtInCommandsHeader" },
      { key: "help.builtInCommandUsages" },
      { key: "help.spacer" },
      { key: "help.section.tabs" },
      { key: "help.spacer" },
      { key: "help.section.session" },
      { key: "help.spacer" },
      { key: "help.section.dom" },
      { key: "help.spacer" },
      { key: "help.section.translate" },
      { key: "help.spacer" },
      { key: "help.section.setting" },
      { key: "help.spacer" },
      { key: "help.section.search" },
      { key: "help.spacer" },
      { key: "help.section.url" },
      { key: "help.spacer" },
      { key: "help.section.keys" }
    ],
    locale
  )
}
