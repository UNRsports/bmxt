import { UI_COMMAND_RUNNERS } from "../compound/run-ui-segment.ts"
import { runBackgroundSegment } from "../compound/run-background-segment.ts"
import { runPickerCommandEntry } from "./picker-entry.ts"
import { runPlainListCommandEntry } from "./plain-list-entry.ts"
import type { CommandEntry } from "./types.ts"

/**
 * EN: Shell-layer command registry (BMXt POSIX Profile P7).
 * Order matters: first matching `tryRun` wins.
 * Background `RUN_CMD` is the final fallback (not listed — see `runCommand`).
 * Keep id order in sync with `commands.test.ts` / `conformance/posix-profile.test.ts`.
 */
export const COMMAND_ENTRIES: readonly CommandEntry[] = [
  { id: "picker", runtime: "ui", tryRun: runPickerCommandEntry },
  { id: "plain-list", runtime: "ui", tryRun: runPlainListCommandEntry },
  { id: "setting", runtime: "ui", tryRun: UI_COMMAND_RUNNERS.setting },
  { id: "tabs-setting", runtime: "ui", tryRun: UI_COMMAND_RUNNERS.tabsSetting },
  { id: "dom-setting", runtime: "ui", tryRun: UI_COMMAND_RUNNERS.domSetting },
  { id: "session", runtime: "ui", tryRun: UI_COMMAND_RUNNERS.session },
  { id: "tabs-list", runtime: "ui", tryRun: UI_COMMAND_RUNNERS.tabsList },
  { id: "search-exit", runtime: "ui", tryRun: UI_COMMAND_RUNNERS.searchExit },
  { id: "nav-enter", runtime: "ui", tryRun: UI_COMMAND_RUNNERS.navEnter },
  { id: "translate", runtime: "ui", tryRun: UI_COMMAND_RUNNERS.translate },
  { id: "nav-exit", runtime: "ui", tryRun: UI_COMMAND_RUNNERS.navExit },
  { id: "dom-exit", runtime: "ui", tryRun: UI_COMMAND_RUNNERS.domExit },
  { id: "group-new", runtime: "ui", tryRun: UI_COMMAND_RUNNERS.groupNew },
  { id: "search-list", runtime: "ui", tryRun: UI_COMMAND_RUNNERS.searchList },
  { id: "help", runtime: "ui", tryRun: UI_COMMAND_RUNNERS.help },
  { id: "dom-list", runtime: "ui", tryRun: UI_COMMAND_RUNNERS.domList },
  { id: "snapshot", runtime: "ui", tryRun: UI_COMMAND_RUNNERS.snapshot }
]

/** EN: Background fallback entry (Service Worker `RUN_CMD` / effects). */
export const BACKGROUND_COMMAND_ENTRY: CommandEntry = {
  id: "background",
  runtime: "background",
  tryRun: async (segment, deps, locale) => runBackgroundSegment(segment, deps, locale)
}

export function listCommandEntryIds(): string[] {
  return COMMAND_ENTRIES.map((entry) => entry.id)
}
