/**
 * EN: Activate a single `#t:<id>` chip when a chip-only segment is submitted (no pipe).
 * JA: チップのみの行を Enter したとき、単一 `#t:<id>` ならそのタブをアクティブにする。
 */

import type { UiLocale } from "../../../setting/locale.ts"
import { tPipe } from "../../../setting/i18n/ns/pipe.ts"
import {
  segmentFailure,
  segmentSuccess
} from "../../compound/classify-outcome.ts"
import type { SegmentOutcome } from "../../compound/types.ts"
import { parseTabChipProducerSegment } from "./tab-chip-producer.ts"

export type ActivateTabChipResult =
  | { ok: true; title: string }
  | { ok: false }

/** EN: Activate tab and focus its window. Returns title on success. */
export async function activateTabChipById(tabId: number): Promise<ActivateTabChipResult> {
  try {
    const tab = await chrome.tabs.get(tabId)
    if (tab.windowId === undefined) {
      return { ok: false }
    }
    await chrome.tabs.update(tabId, { active: true })
    await chrome.windows.update(tab.windowId, { focused: true })
    const rawTitle = typeof tab.title === "string" ? tab.title.trim() : ""
    const title = rawTitle.length > 0 ? rawTitle : `tab ${tabId}`
    return { ok: true, title }
  } catch {
    return { ok: false }
  }
}

/**
 * EN: If `segment` is chip-only, activate when exactly one chip. Null when not a chip segment.
 */
export async function tryActivateTabChipSegment(
  segment: string,
  locale: UiLocale
): Promise<SegmentOutcome | null> {
  const ids = parseTabChipProducerSegment(segment)
  if (ids === null || ids.length === 0) {
    return null
  }
  if (ids.length > 1) {
    return segmentFailure("runtime", [
      tPipe("pipe.tabChip.multiActivateForbidden", locale)
    ])
  }
  const tabId = ids[0]!
  const result = await activateTabChipById(tabId)
  if (!result.ok) {
    return segmentFailure("runtime", [tPipe("pipe.tabChip.activateFailed", locale)])
  }
  return segmentSuccess([
    tPipe("pipe.tabChip.movedTo", locale, { title: result.title })
  ])
}
