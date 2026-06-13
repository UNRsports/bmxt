/**
 * EN: BMXt process UI state (picker columns, pane focus) — persisted while terminal logs exist.
 * JA: ターミナルログが残る間、ピッカー列・ペインフォーカスを storage に保持する。
 */

import { PROCESS_UI_STATE_KEY } from "../extension-storage/keys"
import type { DomListPickerState } from "../dom/dom-list-picker-input"
import type { SearchListPickerState } from "../search/search-list-picker-input"
import type { PaneFocusTarget } from "../side-picker/panel/pane-focus-nav"
import type {
  SessionPickerState,
  SessionPickersByLeaf
} from "../side-picker/session/session-pickers"
import type { DetailBarId } from "./detail-bar-focus"
import { pickerSlotToDetailBar } from "./detail-bar-focus"
import {
  deriveModeToolbarOrderFromPickers,
  isModeToolbarId,
  type ModeToolbarId
} from "./mode-toolbar-order"
import type { TabPickerInteractiveSnapshot } from "../side-picker/session/tab-picker-state"
import { buildTabPickerRows, initialTabPickerHighlightIndex } from "../tabs/picker-rows"
import { computeTabPickerVisibleRowIndices } from "../tabs/tab-picker-fold-state"

type StoredTabPickerSlotV1 = {
  showUrl: boolean
  variant?: "default" | "groupNew"
  interactive: TabPickerInteractiveSnapshot
}

type StoredLeafProcessUiV1 = {
  paneFocus: PaneFocusTarget
  detailBarId?: DetailBarId | null
  modeToolbarOrder?: ModeToolbarId[]
  navArmed?: boolean
  pickers: {
    tabs: StoredTabPickerSlotV1 | null
    search: SearchListPickerState | null
    dom: DomListPickerState | null
  }
}

export type StoredProcessUiStateV1 = {
  v: 1
  byLeaf: Record<string, StoredLeafProcessUiV1>
}

const PANE_FOCUS_VALUES = new Set<PaneFocusTarget>([
  "terminal",
  "detailBar",
  "tabs",
  "search",
  "dom",
  "setting"
])

function isPaneFocusTarget(v: unknown): v is PaneFocusTarget {
  return typeof v === "string" && PANE_FOCUS_VALUES.has(v as PaneFocusTarget)
}

function parseModeToolbarOrder(raw: unknown): ModeToolbarId[] | undefined {
  if (!Array.isArray(raw)) {
    return undefined
  }
  const order: ModeToolbarId[] = []
  for (const entry of raw) {
    if (isModeToolbarId(entry) && !order.includes(entry)) {
      order.push(entry)
    }
  }
  return order.length > 0 ? order : undefined
}

function parseDetailBarId(raw: unknown): DetailBarId | null | undefined {
  if (raw === undefined) {
    return undefined
  }
  if (raw === null) {
    return null
  }
  return isModeToolbarId(raw) ? raw : null
}

function resolveRestoredDetailBarId(
  paneFocus: PaneFocusTarget,
  storedId: DetailBarId | null | undefined,
  modeToolbarOrder: ModeToolbarId[]
): DetailBarId | null {
  if (storedId !== undefined && storedId !== null) {
    return storedId
  }
  if (paneFocus === "detailBar") {
    return modeToolbarOrder[modeToolbarOrder.length - 1] ?? null
  }
  if (
    paneFocus === "tabs" ||
    paneFocus === "search" ||
    paneFocus === "dom" ||
    paneFocus === "setting"
  ) {
    return pickerSlotToDetailBar(paneFocus)
  }
  return storedId ?? null
}

function parseInteractiveSnapshot(raw: unknown): TabPickerInteractiveSnapshot | null {
  if (!raw || typeof raw !== "object") {
    return null
  }
  const o = raw as TabPickerInteractiveSnapshot
  if (o.anchorTabId !== null && (typeof o.anchorTabId !== "number" || !Number.isInteger(o.anchorTabId))) {
    return null
  }
  const markedKind = o.markedKind
  if (
    markedKind !== null &&
    markedKind !== "tab" &&
    markedKind !== "window" &&
    markedKind !== "group"
  ) {
    return null
  }
  const numArr = (v: unknown): number[] => {
    if (!Array.isArray(v)) {
      return []
    }
    return v.filter((x): x is number => typeof x === "number" && Number.isInteger(x))
  }
  const strArr = (v: unknown): string[] => {
    if (!Array.isArray(v)) {
      return []
    }
    return v.filter((x): x is string => typeof x === "string" && x.length > 0 && x.length <= 128)
  }
  return {
    anchorTabId: o.anchorTabId ?? null,
    markedKind,
    markedTabIds: numArr(o.markedTabIds),
    markedWindowIds: numArr(o.markedWindowIds),
    markedGroupKeys: strArr(o.markedGroupKeys),
    hlSearchPattern: typeof o.hlSearchPattern === "string" ? o.hlSearchPattern.slice(0, 512) : ""
  }
}

function parseStoredTabPickerSlot(raw: unknown): StoredTabPickerSlotV1 | null {
  if (!raw || typeof raw !== "object") {
    return null
  }
  const o = raw as StoredTabPickerSlotV1
  if (typeof o.showUrl !== "boolean") {
    return null
  }
  const interactive = parseInteractiveSnapshot(o.interactive)
  if (interactive === null) {
    return null
  }
  const variant = o.variant
  if (variant !== undefined && variant !== "default" && variant !== "groupNew") {
    return null
  }
  return { showUrl: o.showUrl, variant, interactive }
}

function parseStoredLeaf(raw: unknown): StoredLeafProcessUiV1 | null {
  if (!raw || typeof raw !== "object") {
    return null
  }
  const o = raw as StoredLeafProcessUiV1
  if (!isPaneFocusTarget(o.paneFocus) || !o.pickers || typeof o.pickers !== "object") {
    return null
  }
  const tabs =
    o.pickers.tabs === null ? null : parseStoredTabPickerSlot(o.pickers.tabs)
  if (o.pickers.tabs !== null && tabs === null) {
    return null
  }
  const search =
    o.pickers.search === null || (typeof o.pickers.search === "object" && o.pickers.search !== null)
      ? (o.pickers.search as SearchListPickerState | null)
      : null
  const dom =
    o.pickers.dom === null || (typeof o.pickers.dom === "object" && o.pickers.dom !== null)
      ? (o.pickers.dom as DomListPickerState | null)
      : null
  const modeToolbarOrder = parseModeToolbarOrder(o.modeToolbarOrder)
  const detailBarId = parseDetailBarId(o.detailBarId)
  const navArmed = typeof o.navArmed === "boolean" ? o.navArmed : undefined
  return {
    paneFocus: o.paneFocus,
    detailBarId,
    modeToolbarOrder,
    navArmed,
    pickers: { tabs, search, dom }
  }
}

function parseStoredProcessUiState(raw: unknown): StoredProcessUiStateV1 | null {
  if (!raw || typeof raw !== "object") {
    return null
  }
  const o = raw as StoredProcessUiStateV1
  if (o.v !== 1 || typeof o.byLeaf !== "object" || o.byLeaf === null) {
    return null
  }
  const byLeaf: Record<string, StoredLeafProcessUiV1> = {}
  for (const [leafId, leafRaw] of Object.entries(o.byLeaf)) {
    if (typeof leafId !== "string" || leafId.length === 0 || leafId.length > 128) {
      continue
    }
    const leaf = parseStoredLeaf(leafRaw)
    if (leaf !== null) {
      byLeaf[leafId] = leaf
    }
  }
  return { v: 1, byLeaf }
}

export function resolveTabPickerHiFromAnchor(
  rows: import("../tabs/picker-rows").TabPickerRow[],
  anchorTabId: number | null
): number {
  if (anchorTabId !== null) {
    const rowIdx = rows.findIndex((r) => r.kind === "tab" && r.tabId === anchorTabId)
    if (rowIdx >= 0) {
      const visible = computeTabPickerVisibleRowIndices(rows)
      const vHi = visible.indexOf(rowIdx)
      if (vHi >= 0) {
        return vHi
      }
    }
  }
  return initialTabPickerHighlightIndex(rows, undefined)
}

export async function readProcessUiStateFromStorage(): Promise<StoredProcessUiStateV1 | null> {
  try {
    const r = await chrome.storage.local.get(PROCESS_UI_STATE_KEY)
    return parseStoredProcessUiState(r[PROCESS_UI_STATE_KEY])
  } catch {
    return null
  }
}

export function serializeProcessUiState(
  pickersBySession: SessionPickersByLeaf,
  paneFocusByLeaf: Record<string, PaneFocusTarget>,
  validLeafIds: readonly string[],
  detailBarIdByLeaf: Record<string, DetailBarId | null>,
  modeToolbarOrderByLeaf: Record<string, ModeToolbarId[]>,
  navArmedByLeaf: Record<string, boolean>
): StoredProcessUiStateV1 {
  const byLeaf: Record<string, StoredLeafProcessUiV1> = {}
  for (const leafId of validLeafIds) {
    const pickers = pickersBySession[leafId]
    const paneFocus = paneFocusByLeaf[leafId] ?? "terminal"
    const detailBarId = detailBarIdByLeaf[leafId] ?? null
    const modeToolbarOrder = modeToolbarOrderByLeaf[leafId] ?? []
    const navArmed = navArmedByLeaf[leafId] ?? false
    if (!pickers) {
      if (
        paneFocus !== "terminal" ||
        detailBarId !== null ||
        modeToolbarOrder.length > 0 ||
        navArmed
      ) {
        byLeaf[leafId] = {
          paneFocus,
          detailBarId: detailBarId !== null ? detailBarId : undefined,
          modeToolbarOrder: modeToolbarOrder.length > 0 ? modeToolbarOrder : undefined,
          navArmed: navArmed || undefined,
          pickers: { tabs: null, search: null, dom: null }
        }
      }
      continue
    }
    const hasOpen =
      pickers.tabs !== null ||
      pickers.search !== null ||
      pickers.dom !== null ||
      pickers.setting !== null
    if (
      !hasOpen &&
      paneFocus === "terminal" &&
      detailBarId === null &&
      modeToolbarOrder.length === 0 &&
      !navArmed
    ) {
      continue
    }
    byLeaf[leafId] = {
      paneFocus,
      detailBarId: detailBarId !== null ? detailBarId : undefined,
      modeToolbarOrder: modeToolbarOrder.length > 0 ? modeToolbarOrder : undefined,
      navArmed: navArmed || undefined,
      pickers: {
        tabs: pickers.tabs
          ? {
              showUrl: pickers.tabs.showUrl,
              variant: pickers.tabs.variant,
              interactive: pickers.tabs.interactive ?? {
                anchorTabId: null,
                markedKind: null,
                markedTabIds: [],
                markedWindowIds: [],
                markedGroupKeys: [],
                hlSearchPattern: ""
              }
            }
          : null,
        search: pickers.search,
        dom: pickers.dom
      }
    }
  }
  return { v: 1, byLeaf }
}

export async function writeProcessUiStateToStorage(payload: StoredProcessUiStateV1): Promise<void> {
  try {
    if (Object.keys(payload.byLeaf).length === 0) {
      await chrome.storage.local.remove(PROCESS_UI_STATE_KEY)
      return
    }
    await chrome.storage.local.set({ [PROCESS_UI_STATE_KEY]: payload })
  } catch {
    /* ignore */
  }
}

export async function clearProcessUiStateStorage(): Promise<void> {
  try {
    await chrome.storage.local.remove(PROCESS_UI_STATE_KEY)
  } catch {
    /* ignore */
  }
}

export async function rebuildSessionPickersFromStorage(
  stored: StoredProcessUiStateV1
): Promise<{
  pickersBySession: SessionPickersByLeaf
  paneFocusByLeaf: Record<string, PaneFocusTarget>
  detailBarIdByLeaf: Record<string, DetailBarId | null>
  modeToolbarOrderByLeaf: Record<string, ModeToolbarId[]>
  navArmedByLeaf: Record<string, boolean>
}> {
  const pickersBySession: SessionPickersByLeaf = {}
  const paneFocusByLeaf: Record<string, PaneFocusTarget> = {}
  const detailBarIdByLeaf: Record<string, DetailBarId | null> = {}
  const modeToolbarOrderByLeaf: Record<string, ModeToolbarId[]> = {}
  const navArmedByLeaf: Record<string, boolean> = {}

  for (const [leafId, leaf] of Object.entries(stored.byLeaf)) {
    paneFocusByLeaf[leafId] = leaf.paneFocus
    const pickers: SessionPickerState = {
      tabs: null,
      search: null,
      dom: null,
      setting: null
    }

    if (leaf.pickers.tabs) {
      const t = leaf.pickers.tabs
      try {
        const rows = await buildTabPickerRows(t.showUrl)
        const initialHi = resolveTabPickerHiFromAnchor(rows, t.interactive.anchorTabId)
        pickers.tabs = {
          rows,
          showUrl: t.showUrl,
          initialHi,
          variant: t.variant,
          interactive: t.interactive
        }
      } catch {
        /* skip broken tab picker restore */
      }
    }
    if (leaf.pickers.search) {
      pickers.search = leaf.pickers.search
    }
    if (leaf.pickers.dom) {
      pickers.dom = leaf.pickers.dom
    }

    if (
      pickers.tabs !== null ||
      pickers.search !== null ||
      pickers.dom !== null ||
      pickers.setting !== null
    ) {
      pickersBySession[leafId] = pickers
    }

    const navArmed = leaf.navArmed ?? false
    navArmedByLeaf[leafId] = navArmed
    const hasRestoredPickers =
      pickers.tabs !== null ||
      pickers.search !== null ||
      pickers.dom !== null ||
      pickers.setting !== null
    const modeToolbarOrder =
      leaf.modeToolbarOrder ??
      deriveModeToolbarOrderFromPickers(hasRestoredPickers ? pickers : undefined, navArmed)
    if (modeToolbarOrder.length > 0) {
      modeToolbarOrderByLeaf[leafId] = modeToolbarOrder
    }
    const detailBarId = resolveRestoredDetailBarId(
      leaf.paneFocus,
      leaf.detailBarId,
      modeToolbarOrder
    )
    if (detailBarId !== null) {
      detailBarIdByLeaf[leafId] = detailBarId
    }
  }

  return {
    pickersBySession,
    paneFocusByLeaf,
    detailBarIdByLeaf,
    modeToolbarOrderByLeaf,
    navArmedByLeaf
  }
}
