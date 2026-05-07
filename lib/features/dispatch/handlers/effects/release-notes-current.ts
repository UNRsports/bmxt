import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import { linesForCurrentVersion } from "../../../release-notes/format-terminal"

type E = Extract<ChromeEffect, { kind: "release_notes_current" }>

export async function applyReleaseNotesCurrentEffect(
  _ctx: DispatchChromeContext,
  _e: E
): Promise<string[]> {
  const v = chrome.runtime.getManifest().version
  return linesForCurrentVersion(v)
}
