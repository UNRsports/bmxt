/** Tab picker: structured rows for interactive UI + same grouping as legacy tabs list. */

import { displayTitle } from "../format/display-title"
import { LAST_NORMAL_WINDOW_KEY } from "../extension-storage/keys"
import {
  getWindowDisplayNamesMap,
  pruneWindowDisplayNames
} from "../extension-storage/window-display-names"

export { displayTitle }

const TAB_GROUP_ID_NONE = chrome.tabGroups.TAB_GROUP_ID_NONE

export type TabPickerRow =
  | { kind: "window"; windowId: number; label: string; focused: boolean }
  | { kind: "group"; windowId: number; groupId: number | null; label: string }
  | {
      kind: "tab"
      tabId: number
      windowId: number
      groupId: number | null
      title: string
      url: string
      active: boolean
    }

function groupKey(tab: chrome.tabs.Tab): number | "none" {
  const g = tab.groupId
  if (g === undefined || g === TAB_GROUP_ID_NONE) {
    return "none"
  }
  return g
}

function formatGroupLabel(g: chrome.tabGroups.TabGroup | undefined): string {
  if (!g) {
    return "(不明なグループ)"
  }
  const raw = (g.title || "").trim()
  if (!raw) {
    return `(無題のグループ) [${g.color}]`
  }
  return `【${displayTitle(raw)}】`
}

function tabUrl(t: chrome.tabs.Tab): string {
  return t.url || t.pendingUrl || ""
}

/** Build rows (window / group headers + tabs) for the picker. `showUrl` is stored per picker session for UI. */
export async function buildTabPickerRows(_showUrl: boolean): Promise<TabPickerRow[]> {
  const tabs = await chrome.tabs.query({})
  if (tabs.length === 0) {
    return []
  }
  const groups = await chrome.tabGroups.query({})
  const groupMeta = new Map<number, chrome.tabGroups.TabGroup>()
  for (const g of groups) {
    groupMeta.set(g.id, g)
  }
  const winsMeta = await chrome.windows.getAll({ populate: false })
  const winFocused = new Map<number, boolean>()
  const openWindowIds: number[] = []
  for (const w of winsMeta) {
    if (w.id !== undefined) {
      winFocused.set(w.id, Boolean(w.focused))
      openWindowIds.push(w.id)
    }
  }
  await pruneWindowDisplayNames(openWindowIds)
  const windowDisplayNames = await getWindowDisplayNamesMap()

  const sorted = [...tabs].sort((a, b) => {
    const wa = a.windowId ?? 0
    const wb = b.windowId ?? 0
    if (wa !== wb) {
      return wa - wb
    }
    return (a.index ?? 0) - (b.index ?? 0)
  })

  const byWindow = new Map<number, chrome.tabs.Tab[]>()
  for (const t of sorted) {
    const wid = t.windowId ?? 0
    const arr = byWindow.get(wid)
    if (arr) {
      arr.push(t)
    } else {
      byWindow.set(wid, [t])
    }
  }

  const windowOrder = [...new Set(sorted.map((t) => t.windowId ?? 0))].sort((a, b) => a - b)
  const rows: TabPickerRow[] = []

  for (const wid of windowOrder) {
    const wTabs = byWindow.get(wid)
    if (!wTabs?.length) {
      continue
    }
    const active = wTabs.find((t) => t.active) ?? wTabs[0]
    const f = winFocused.get(wid) ?? false
    const customName = windowDisplayNames.get(wid)
    const windowTitle =
      customName !== undefined ? customName : displayTitle(active?.title ?? "")
    rows.push({
      kind: "window",
      windowId: wid,
      label: `${f ? "*" : " "}[ウィンドウ] ${windowTitle}`,
      focused: f
    })

    let prevKey: number | "none" | undefined
    for (const t of wTabs) {
      const key = groupKey(t)
      if (key !== prevKey) {
        if (key === "none") {
          rows.push({ kind: "group", windowId: wid, groupId: null, label: "(グループなし)" })
        } else {
          rows.push({
            kind: "group",
            windowId: wid,
            groupId: key,
            label: formatGroupLabel(groupMeta.get(key))
          })
        }
        prevKey = key
      }
      rows.push({
        kind: "tab",
        tabId: t.id!,
        windowId: wid,
        groupId: key === "none" ? null : key,
        title: t.title || "",
        url: tabUrl(t),
        active: Boolean(t.active)
      })
    }
  }

  return rows
}

import {
  parsePickerSearchNeedle,
  splitTextHighlightSegments
} from "../side-picker/search/picker-search-needle"

export {
  parsePickerSearchNeedle as parseTabPickerSearchNeedle,
  parsePickerSearchNeedle,
  splitTextHighlightSegments
}

/**
 * `searchHighlightQuery` にマッチする可視行の `hi` 位置（`visibleRowIndices` 内の index）を返す。
 * - 非 `@` モード: タブ（title / displayTitle）・ウィンドウ・グループの label を対象に部分一致（大小無視）
 * - `@` モード: タブの URL のみを対象に部分一致（ウィンドウ/グループは URL を持たないため対象外）
 * - 空クエリは空配列を返す（`n`/`N` ジャンプ対象なし）
 */
export function tabPickerVisibleHiIndicesMatching(
  rows: TabPickerRow[],
  visibleRowIndices: number[],
  searchHighlightQuery: string
): number[] {
  const { byUrl, needle } = parsePickerSearchNeedle(searchHighlightQuery)
  if (needle === "") {
    return []
  }
  const lc = needle.toLowerCase()
  const out: number[] = []
  for (let vi = 0; vi < visibleRowIndices.length; vi++) {
    const ri = visibleRowIndices[vi]
    if (ri === undefined) {
      continue
    }
    const r = rows[ri]
    if (!r) {
      continue
    }
    if (r.kind === "tab") {
      if (byUrl) {
        if ((r.url || "").toLowerCase().includes(lc)) {
          out.push(vi)
        }
      } else {
        const plain = (r.title || "").trim()
        if (
          plain.toLowerCase().includes(lc) ||
          displayTitle(r.title).toLowerCase().includes(lc)
        ) {
          out.push(vi)
        }
      }
    } else if (!byUrl) {
      if (r.label.toLowerCase().includes(lc)) {
        out.push(vi)
      }
    }
  }
  return out
}

/** Indices into `rows` of tab rows matching the filter. Empty query matches all. `@` prefix -> URL substring (after @). */
export function filterTabRowIndices(rows: TabPickerRow[], filterQuery: string): number[] {
  const { byUrl, needle } = parsePickerSearchNeedle(filterQuery)

  const out: number[] = []
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!
    if (r.kind !== "tab") {
      continue
    }
    if (!needle) {
      out.push(i)
      continue
    }
    if (byUrl) {
      const u = (r.url || "").toLowerCase()
      if (u.includes(needle.toLowerCase())) {
        out.push(i)
      }
    } else {
      const plain = (r.title || "").trim()
      if (
        plain.includes(needle) ||
        plain.toLowerCase().includes(needle.toLowerCase()) ||
        displayTitle(r.title).toLowerCase().includes(needle.toLowerCase())
      ) {
        out.push(i)
      }
    }
  }
  return out
}

/**
 * Initial `hi` when all picker rows are visible (launch with empty filter).
 * `hi` indexes `visibleRowIndices` → index into `rows`; with every row visible that is
 * the tab row index in `rows`, **not** the index among tab-only rows (which omitted headers).
 */
export function initialTabPickerHighlightIndex(
  rows: TabPickerRow[],
  anchorWindowId: number | undefined
): number {
  const tabIndices = filterTabRowIndices(rows, "")
  if (tabIndices.length === 0) {
    return 0
  }

  const pickTabRowIdx = (): number => {
    if (anchorWindowId !== undefined) {
      const hit = tabIndices.find((rowIdx) => {
        const r = rows[rowIdx]
        return (
          r?.kind === "tab" &&
          r.windowId === anchorWindowId &&
          r.active
        )
      })
      if (hit !== undefined) {
        return hit
      }
    }
    const anyActive = tabIndices.find((rowIdx) => {
      const r = rows[rowIdx]
      return r?.kind === "tab" && r.active
    })
    return anyActive ?? tabIndices[0]!
  }

  return pickTabRowIdx()
}

export async function resolveInitialTabPickerHighlightIndex(
  rows: TabPickerRow[]
): Promise<number> {
  const r = await chrome.storage.local.get(LAST_NORMAL_WINDOW_KEY)
  const wid = r[LAST_NORMAL_WINDOW_KEY]
  const anchorWid =
    typeof wid === "number" && Number.isInteger(wid) ? wid : undefined
  return initialTabPickerHighlightIndex(rows, anchorWid)
}
