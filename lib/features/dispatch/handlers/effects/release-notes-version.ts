import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import { linesForVersionKey } from "../../../release-notes/format-terminal"

type E = Extract<ChromeEffect, { kind: "release_notes_version" }>

export async function applyReleaseNotesVersionEffect(
  _ctx: DispatchChromeContext,
  e: E
): Promise<string[]> {
  return linesForVersionKey(e.version)
}
