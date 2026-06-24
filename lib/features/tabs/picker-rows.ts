/** Tab picker: structured rows for interactive UI + same grouping as legacy tabs list. */

import { displayTitle } from "../format/display-title"
import { tTabs } from "../setting/i18n/ns/tabs"
import { getRunLocale } from "../setting/i18n/run-locale"
import type { UiLocale } from "../setting/locale"
import { loadPickerChromeContext } from "./picker-chrome-context"
import { normalizeTabGroupColor } from "./tab-picker-overlay-constants"
import type { NewGroupPaletteColor } from "./tab-picker-overlay-constants"
import { resolveTabFaviconSrc } from "./tab-favicon-url"
import {
  resolveLiveTabTitle,
  resolveLiveTabUrl,
  seedTabPickerLiveFields
} from "./tab-picker-live-tab-fields"

export { displayTitle }

const TAB_GROUP_ID_NONE = chrome.tabGroups.TAB_GROUP_ID_NONE

export type TabPickerRow =
  | {
      kind: "window"
      windowId: number
      label: string
      windowTitle: string
      usesActiveTabTitle: boolean
      focused: boolean
    }
  | {
      kind: "group"
      windowId: number
      groupId: number | null
      label: string
      color: NewGroupPaletteColor
    }
  | {
      kind: "tab"
      tabId: number
      windowId: number
      groupId: number | null
      groupColor: NewGroupPaletteColor | null
      title: string
      url: string
      faviconSrc: string | null
      active: boolean
    }

function groupKey(tab: chrome.tabs.Tab): number | "none" {
  const g = tab.groupId
  if (g === undefined || g === TAB_GROUP_ID_NONE) {
    return "none"
  }
  return g
}

function formatGroupLabel(g: chrome.tabGroups.TabGroup | undefined, locale: UiLocale): string {
  if (!g) {
    return tTabs("tabs.picker.unknownGroup", locale)
  }
  const raw = (g.title || "").trim()
  if (!raw) {
    return tTabs("tabs.picker.untitledGroup", locale, { color: g.color })
  }
  return `【${displayTitle(raw, locale)}】`
}

function tabUrl(t: chrome.tabs.Tab): string {
  return t.url || t.pendingUrl || ""
}

/** Build rows (window / group headers + tabs) for the picker. `showUrl` is stored per picker session for UI. */
export async function buildTabPickerRows(
  showUrl: boolean,
  locale: UiLocale = getRunLocale()
): Promise<TabPickerRow[]> {
  const bundle = await buildTabPickerRowsBundle(showUrl, locale)
  return bundle.rows
}

export type TabPickerRowsBundle = {
  rows: TabPickerRow[]
  lastNormalWindowId: number | undefined
}

/** EN: Row build + highlight anchor in one pass (no extra storage read). */
export async function buildTabPickerRowsBundle(
  _showUrl: boolean,
  locale: UiLocale = getRunLocale()
): Promise<TabPickerRowsBundle> {
  const [tabs, groups, winsMeta] = await Promise.all([
    chrome.tabs.query({}),
    chrome.tabGroups.query({}),
    chrome.windows.getAll({ populate: false })
  ])
  if (tabs.length === 0) {
    return { rows: [], lastNormalWindowId: undefined }
  }
  const groupMeta = new Map<number, chrome.tabGroups.TabGroup>()
  for (const g of groups) {
    groupMeta.set(g.id, g)
  }
  const openWindowIds: number[] = []
  for (const w of winsMeta) {
    if (w.id !== undefined) {
      openWindowIds.push(w.id)
    }
  }
  const chromeContext = await loadPickerChromeContext(openWindowIds)
  const windowDisplayNames = chromeContext.windowDisplayNames
  const trackedWindowId = chromeContext.trackedWindowId

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
    const tracked = trackedWindowId !== undefined && wid === trackedWindowId
    const customName = windowDisplayNames.get(wid)
    const usesActiveTabTitle = customName === undefined
    const activeTabId = active?.id
    const activeRawTitle = active?.title ?? ""
    const activeRawUrl = active ? tabUrl(active) : ""
    if (activeTabId !== undefined) {
      seedTabPickerLiveFields(activeTabId, activeRawTitle, activeRawUrl)
    }
    const windowTitle =
      customName !== undefined ? customName : displayTitle(activeRawTitle, locale)
    rows.push({
      kind: "window",
      windowId: wid,
      windowTitle,
      usesActiveTabTitle,
      label: tTabs("tabs.picker.windowLabel", locale, {
        star: tracked ? "*" : " ",
        title: windowTitle
      }),
      focused: tracked
    })

    let prevKey: number | "none" | undefined
    for (const t of wTabs) {
      const key = groupKey(t)
      if (key !== prevKey) {
        if (key !== "none") {
          const meta = groupMeta.get(key)
          rows.push({
            kind: "group",
            windowId: wid,
            groupId: key,
            label: formatGroupLabel(meta, locale),
            color: normalizeTabGroupColor(meta?.color)
          })
        }
        prevKey = key
      }
      const tabId = t.id!
      const rawTitle = t.title || ""
      const rawUrl = tabUrl(t)
      seedTabPickerLiveFields(tabId, rawTitle, rawUrl)
      const groupColor =
        key === "none" ? null : normalizeTabGroupColor(groupMeta.get(key)?.color)
      rows.push({
        kind: "tab",
        tabId,
        windowId: wid,
        groupId: key === "none" ? null : key,
        groupColor,
        title: rawTitle,
        url: rawUrl,
        faviconSrc: resolveTabFaviconSrc(rawUrl),
        active: Boolean(t.active)
      })
    }
  }

  return {
    rows,
    lastNormalWindowId: chromeContext.lastNormalWindowId
  }
}

import {
  parsePickerSearchNeedle,
  splitTextHighlightSegments
} from "../side-picker/search/picker-search-needle"


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
        const url = resolveLiveTabUrl(r.tabId, r.url || "")
        if (url.toLowerCase().includes(lc)) {
          out.push(vi)
        }
      } else {
        const title = resolveLiveTabTitle(r.tabId, r.title || "")
        const plain = title.trim()
        if (
          plain.toLowerCase().includes(lc) ||
          displayTitle(title).toLowerCase().includes(lc)
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
      const u = resolveLiveTabUrl(r.tabId, r.url || "").toLowerCase()
      if (u.includes(needle.toLowerCase())) {
        out.push(i)
      }
    } else {
      const title = resolveLiveTabTitle(r.tabId, r.title || "")
      const plain = title.trim()
      if (
        plain.includes(needle) ||
        plain.toLowerCase().includes(needle.toLowerCase()) ||
        displayTitle(title).toLowerCase().includes(needle.toLowerCase())
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

export function resolveInitialTabPickerHighlightIndex(
  rows: TabPickerRow[],
  lastNormalWindowId?: number
): number {
  return initialTabPickerHighlightIndex(rows, lastNormalWindowId)
}
