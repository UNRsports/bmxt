import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import { linesVersionList } from "../../../release-notes/format-terminal"

type E = Extract<ChromeEffect, { kind: "release_notes_list" }>

export async function applyReleaseNotesListEffect(
  _ctx: DispatchChromeContext,
  _e: E
): Promise<string[]> {
  return linesVersionList()
}
