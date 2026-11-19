import type { BmxtRuleRecord, BmxtRuleStream } from "../../../bmxt-rule/types.ts"
import {
  sanitizeGroupColor,
  sanitizeGroupTitle
} from "../../../sync/bus/remote-open-sanitize.ts"
import type { NewGroupPaletteColor } from "../../../tabs/tab-picker-overlay-constants.ts"

export type SyncOpenUrlBatch = {
  groupTitle: string | null
  /** EN: Source tab group color; null when the batch is ungrouped. */
  groupColor: NewGroupPaletteColor | null
  urls: string[]
  /** EN: Parallel to `urls`; local tab ids only (remote rows are null). */
  tabIds: Array<number | null>
}

function entryValue(record: BmxtRuleRecord, key: string): string | number | boolean | null {
  for (const [k, value] of record.entries) {
    if (k === key) {
      return value
    }
  }
  return null
}

function urlFromRecord(record: BmxtRuleRecord): string | null {
  const url = entryValue(record, "url")
  if (typeof url !== "string") {
    return null
  }
  const trimmed = url.trim()
  if (trimmed.length === 0) {
    return null
  }
  return trimmed
}

/**
 * EN: Prefer raw `title` from list/sync; fall back to label without UI wrappers.
 * JA: list/sync の生 `title` を優先。なければ UI 装飾を除いた label。
 */
function rawTitleFromGroup(record: BmxtRuleRecord): string | null {
  const title = entryValue(record, "title")
  if (typeof title === "string") {
    const trimmed = title.trim()
    return trimmed.length > 0 ? trimmed : null
  }
  const label = entryValue(record, "label")
  if (typeof label === "string" && label.trim().length > 0) {
    return stripUiGroupWrappers(label.trim())
  }
  const pageTitle = entryValue(record, "pageTitle")
  if (typeof pageTitle === "string" && pageTitle.trim().length > 0) {
    return stripUiGroupWrappers(pageTitle.trim())
  }
  return null
}

function stripUiGroupWrappers(raw: string): string | null {
  const wrapped = /^【([\s\S]+)】$/.exec(raw)
  if (wrapped !== null && wrapped[1] !== undefined) {
    const inner = wrapped[1].trim()
    return inner.length > 0 ? inner : null
  }
  return raw
}

function colorFromGroup(record: BmxtRuleRecord): NewGroupPaletteColor | null {
  const color = entryValue(record, "color")
  if (typeof color !== "string") {
    return null
  }
  return sanitizeGroupColor(color)
}

/**
 * EN: Walk stream in order; page.group sets current title/color; URL-bearing kinds append.
 */
function tabIdFromRecord(record: BmxtRuleRecord): number | null {
  const remote = entryValue(record, "remote")
  if (remote === true) {
    return null
  }
  const tabId = entryValue(record, "tabId")
  if (typeof tabId === "number" && Number.isFinite(tabId)) {
    return tabId
  }
  return null
}

type CurrentGroupMeta = {
  title: string | null
  color: NewGroupPaletteColor | null
  /** EN: True after a page.group row (even untitled with color only). */
  active: boolean
}

export function urlBatchesFromBmxtRuleStream(stream: BmxtRuleStream): SyncOpenUrlBatch[] {
  const batches: SyncOpenUrlBatch[] = []
  let currentGroup: CurrentGroupMeta = { title: null, color: null, active: false }
  let currentUrls: string[] = []
  let currentTabIds: Array<number | null> = []

  const flush = (): void => {
    if (currentUrls.length === 0) {
      return
    }
    const grouped = currentGroup.active
    const groupTitle = grouped ? sanitizeGroupTitle(currentGroup.title) : null
    // EN: Untitled groups need a color so the peer still creates a group.
    // JA: 無題グループは peer 側でグループ化するトリガとして色が必要。
    const groupColor = grouped
      ? currentGroup.color ?? (groupTitle === null ? "grey" : null)
      : null
    batches.push({
      groupTitle,
      groupColor,
      urls: [...currentUrls],
      tabIds: [...currentTabIds]
    })
    currentUrls = []
    currentTabIds = []
  }

  for (const record of stream.records) {
    if (record.kind === "page.group") {
      flush()
      // EN: Chip streams mark the end of a group run with `ungrouped: true`.
      // JA: チップストリームはグループ連続の終わりを `ungrouped: true` で示す。
      if (entryValue(record, "ungrouped") === true) {
        currentGroup = { title: null, color: null, active: false }
        continue
      }
      const color = colorFromGroup(record)
      currentGroup = {
        title: rawTitleFromGroup(record),
        color,
        // EN: page.group always starts a group batch (color may be null for older streams).
        active: true
      }
      continue
    }
    if (
      record.kind === "page.open" ||
      record.kind === "bookmark" ||
      record.kind === "history" ||
      record.kind === "markdown.file" ||
      record.kind === "search.hit"
    ) {
      const url = urlFromRecord(record)
      if (url !== null) {
        currentUrls.push(url)
        currentTabIds.push(tabIdFromRecord(record))
      }
    }
  }
  flush()
  return batches
}

/** EN: True when any URL-bearing record is marked remote. */
export function streamHasRemotePageOpen(stream: BmxtRuleStream): boolean {
  for (const record of stream.records) {
    if (record.kind !== "page.open") {
      continue
    }
    if (entryValue(record, "remote") === true) {
      return true
    }
  }
  return false
}
