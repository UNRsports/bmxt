import { runBackgroundSegment } from "../compound/run-background-segment.ts"
import type { CommandEntry } from "./types.ts"

/**
 * EN: Shell-layer command registry (BMXt POSIX Profile P7).
 * Phase 6: grammar lives in WASM; compound segments use `runDispatch` + `applyUiActionForSegment`.
 * `COMMAND_ENTRIES` is intentionally empty — see `run-command.ts`.
 */
export const COMMAND_ENTRIES: readonly CommandEntry[] = []

/** EN: Background fallback entry (Service Worker `RUN_CMD` / effects). */
export const BACKGROUND_COMMAND_ENTRY: CommandEntry = {
  id: "background",
  runtime: "background",
  tryRun: async (segment, deps, locale, options) =>
    runBackgroundSegment(segment, deps, locale, {
      suppressLogPatches: options?.suppressLogPatches === true
    })
}

export function listCommandEntryIds(): string[] {
  return COMMAND_ENTRIES.map((entry) => entry.id)
}
