/**
 * EN: Per-tab float open picker columns (survives handoff / same-tab navigation).
 * JA: タブ別フロートの開いているピッカー列（引き継ぎ・同一タブ遷移で維持）。
 */

import { FLOAT_PICKERS_BY_TAB_KEY } from "../extension-storage/keys.ts"
import type { SessionPickersByLeaf, SessionPickerState } from "../side-picker/session/session-pickers.ts"
import type {
  TabPickerInteractiveSnapshot,
  TabPickerState
} from "../side-picker/session/tab-picker-state.ts"
import { emptyTabPickerInteractiveSnapshot } from "../side-picker/session/tab-picker-state.ts"
import type { SelectKind } from "../tabs/tab-picker-overlay-types.ts"

function tabKey(tabId: number): string {
  return String(tabId)
}

function parseMarkedKind(value: unknown): SelectKind | null {
  if (value === "tab" || value === "window" || value === "group") {
    return value
  }
  return null
}

function parseTabPickerState(raw: unknown): TabPickerState | null {
  if (!raw || typeof raw !== "object") {
    return null
  }
  const o = raw as Record<string, unknown>
  if (!Array.isArray(o.rows) || typeof o.showUrl !== "boolean") {
    return null
  }
  if (typeof o.initialHi !== "number" || !Number.isInteger(o.initialHi) || o.initialHi < 0) {
    return null
  }
  const variant =
    o.variant === "groupNew" || o.variant === "default" ? o.variant : "default"
  let interactive: TabPickerInteractiveSnapshot = emptyTabPickerInteractiveSnapshot()
  if (o.interactive && typeof o.interactive === "object") {
    const i = o.interactive as Record<string, unknown>
    if (
      (typeof i.anchorTabId === "number" || i.anchorTabId === null) &&
      Array.isArray(i.markedTabIds) &&
      Array.isArray(i.markedWindowIds) &&
      Array.isArray(i.markedGroupKeys) &&
      typeof i.hlSearchPattern === "string"
    ) {
      interactive = {
        anchorTabId: typeof i.anchorTabId === "number" ? i.anchorTabId : null,
        markedKind: parseMarkedKind(i.markedKind),
        markedTabIds: i.markedTabIds.filter(
          (id): id is number => typeof id === "number" && Number.isInteger(id)
        ),
        markedWindowIds: i.markedWindowIds.filter(
          (id): id is number => typeof id === "number" && Number.isInteger(id)
        ),
        markedGroupKeys: i.markedGroupKeys.filter((k): k is string => typeof k === "string"),
        hlSearchPattern: i.hlSearchPattern
      }
    }
  }
  return {
    rows: o.rows as TabPickerState["rows"],
    showUrl: o.showUrl,
    initialHi: o.initialHi,
    variant,
    interactive
  }
}

function parseSessionPickerState(raw: unknown): SessionPickerState | null {
  if (!raw || typeof raw !== "object") {
    return null
  }
  const o = raw as Record<string, unknown>
  const tabs = o.tabs === null ? null : parseTabPickerState(o.tabs)
  if (o.tabs !== null && tabs === null) {
    return null
  }
  const search =
    o.search === null || (typeof o.search === "object" && o.search !== null)
      ? (o.search as SessionPickerState["search"])
      : null
  const dom =
    o.dom === null || (typeof o.dom === "object" && o.dom !== null)
      ? (o.dom as SessionPickerState["dom"])
      : null
  const setting =
    o.setting === null || (typeof o.setting === "object" && o.setting !== null)
      ? (o.setting as SessionPickerState["setting"])
      : null
  return { tabs, search, dom, setting }
}

export function parseFloatPickersBySession(value: unknown): SessionPickersByLeaf | null {
  if (!value || typeof value !== "object") {
    return null
  }
  const out: SessionPickersByLeaf = {}
  for (const [leafId, raw] of Object.entries(value as Record<string, unknown>)) {
    const parsed = parseSessionPickerState(raw)
    if (parsed !== null) {
      out[leafId] = parsed
    }
  }
  return out
}

async function readAll(): Promise<Record<string, SessionPickersByLeaf>> {
  try {
    const raw = await chrome.storage.session.get(FLOAT_PICKERS_BY_TAB_KEY)
    const bag = raw[FLOAT_PICKERS_BY_TAB_KEY]
    if (!bag || typeof bag !== "object") {
      return {}
    }
    const out: Record<string, SessionPickersByLeaf> = {}
    for (const [key, value] of Object.entries(bag as Record<string, unknown>)) {
      const parsed = parseFloatPickersBySession(value)
      if (parsed !== null) {
        out[key] = parsed
      }
    }
    return out
  } catch {
    return {}
  }
}

async function writeAll(bag: Record<string, SessionPickersByLeaf>): Promise<void> {
  try {
    await chrome.storage.session.set({ [FLOAT_PICKERS_BY_TAB_KEY]: bag })
  } catch {
    /* session storage unavailable */
  }
}

export async function loadFloatPickersForTab(
  tabId: number
): Promise<SessionPickersByLeaf | null> {
  if (!Number.isInteger(tabId) || tabId < 0) {
    return null
  }
  const bag = await readAll()
  return bag[tabKey(tabId)] ?? null
}

export async function saveFloatPickersForTab(
  tabId: number,
  pickers: SessionPickersByLeaf
): Promise<void> {
  if (!Number.isInteger(tabId) || tabId < 0) {
    return
  }
  const bag = await readAll()
  if (Object.keys(pickers).length === 0) {
    delete bag[tabKey(tabId)]
  } else {
    bag[tabKey(tabId)] = pickers
  }
  await writeAll(bag)
}

export async function clearFloatPickersForTab(tabId: number): Promise<void> {
  if (!Number.isInteger(tabId) || tabId < 0) {
    return
  }
  const bag = await readAll()
  delete bag[tabKey(tabId)]
  await writeAll(bag)
}
