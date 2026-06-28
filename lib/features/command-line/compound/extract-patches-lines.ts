import type { SessionPatch } from "../../bmxt-window/terminal-sessions/session-patches.ts"

/** EN: Log lines contributed by RUN_CMD patches, excluding prompt echoes (`> …`). */
export function extractLogLinesFromPatches(
  patches: readonly SessionPatch[],
  sessionId: string
): string[] {
  const out: string[] = []
  for (const patch of patches) {
    if (patch.type !== "appendLog" && patch.type !== "setLog") {
      continue
    }
    if (patch.sessionId !== sessionId) {
      continue
    }
    for (const line of patch.lines) {
      if (line.startsWith("> ")) {
        continue
      }
      out.push(line)
    }
  }
  return out
}
