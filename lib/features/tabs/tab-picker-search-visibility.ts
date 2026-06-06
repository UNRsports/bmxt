/** EN: Pure search-time row visibility for tab picker (no fold / Chrome deps). */

import { displayTitle } from "../format/display-title"
import { parsePickerSearchNeedle } from "../side-picker/search/picker-search-needle"
import type { TabPickerRow } from "./picker-rows"
import { groupRowKey } from "./tab-picker-keyboard"

export function tabPickerTabRowMatchesSearch(
  row: TabPickerRow & { kind: "tab" },
  byUrl: boolean,
  lcNeedle: string
): boolean {
  if (byUrl) {
    return (row.url || "").toLowerCase().includes(lcNeedle)
  }
  const plain = (row.title || "").trim()
  return (
    plain.toLowerCase().includes(lcNeedle) ||
    plain.includes(lcNeedle) ||
    displayTitle(row.title).toLowerCase().includes(lcNeedle)
  )
}

export function tabPickerHeaderLabelMatchesSearch(
  label: string,
  byUrl: boolean,
  lcNeedle: string
): boolean {
  return !byUrl && label.toLowerCase().includes(lcNeedle)
}

/**
 * EN: During `/` input — virtually expand matching trees and hide non-matching tabs.
 * `fallbackVisible` is used when the needle is empty (typically fold-based visibility).
 */
export function computeTabPickerSearchFilteredRowIndices(
  rows: TabPickerRow[],
  filterQuery: string,
  fallbackVisible: readonly number[]
): number[] {
  const { byUrl, needle } = parsePickerSearchNeedle(filterQuery)
  if (needle === "") {
    return [...fallbackVisible]
  }
  const lc = needle.toLowerCase()

  const windowLabelMatch = new Map<number, boolean>()
  const groupLabelMatch = new Map<string, boolean>()
  const tabMatch = new Set<number>()

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!
    if (r.kind === "window") {
      windowLabelMatch.set(r.windowId, tabPickerHeaderLabelMatchesSearch(r.label, byUrl, lc))
    } else if (r.kind === "group") {
      groupLabelMatch.set(
        groupRowKey(r.windowId, r.groupId),
        tabPickerHeaderLabelMatchesSearch(r.label, byUrl, lc)
      )
    } else if (r.kind === "tab" && tabPickerTabRowMatchesSearch(r, byUrl, lc)) {
      tabMatch.add(i)
    }
  }

  const windowShow = new Map<number, boolean>()
  const windowShowAll = new Map<number, boolean>()
  const groupShow = new Map<string, boolean>()
  const groupShowAll = new Map<string, boolean>()

  for (const r of rows) {
    if (r.kind === "window") {
      const labelMatched = windowLabelMatch.get(r.windowId) ?? false
      windowShowAll.set(r.windowId, labelMatched)
      windowShow.set(r.windowId, labelMatched)
    }
  }

  for (const tabIdx of tabMatch) {
    const tab = rows[tabIdx]
    if (tab?.kind !== "tab") {
      continue
    }
    windowShow.set(tab.windowId, true)
    if (tab.groupId !== null) {
      const gKey = groupRowKey(tab.windowId, tab.groupId)
      groupShow.set(gKey, true)
    }
  }

  for (const [gKey, matched] of groupLabelMatch) {
    if (matched) {
      groupShow.set(gKey, true)
      groupShowAll.set(gKey, true)
    }
  }

  for (const r of rows) {
    if (r.kind === "group") {
      const gKey = groupRowKey(r.windowId, r.groupId)
      if (groupShowAll.get(gKey)) {
        windowShow.set(r.windowId, true)
      }
    }
  }

  const out: number[] = []
  let windowVisible = false
  let windowAll = false
  let groupVisible = false
  let groupAll = false

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!
    if (r.kind === "window") {
      windowVisible = windowShow.get(r.windowId) ?? false
      windowAll = windowShowAll.get(r.windowId) ?? false
      groupVisible = false
      groupAll = false
      if (windowVisible) {
        out.push(i)
      }
      continue
    }
    if (r.kind === "group") {
      if (!windowVisible) {
        continue
      }
      const gKey = groupRowKey(r.windowId, r.groupId)
      groupVisible = groupShow.get(gKey) ?? false
      groupAll = groupShowAll.get(gKey) ?? false
      if (groupVisible) {
        out.push(i)
      }
      continue
    }
    if (r.kind === "tab") {
      if (!windowVisible) {
        continue
      }
      if (windowAll) {
        out.push(i)
        continue
      }
      if (r.groupId !== null) {
        if (!groupVisible) {
          continue
        }
        if (groupAll || tabMatch.has(i)) {
          out.push(i)
        }
        continue
      }
      if (tabMatch.has(i)) {
        out.push(i)
      }
    }
  }
  return out
}
