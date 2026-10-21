/**
 * EN: Per-tab float browse state (nav armed/active + leaf process UI) for same-tab navigation.
 * JA: タブ別フロートのブラウズ状態（nav 武装/ON とリーフ UI）。同一タブ遷移で維持。
 */

import { FLOAT_BROWSE_STATE_BY_TAB_KEY } from "../extension-storage/keys.ts"
import type { PaneFocusTarget } from "../side-picker/panel/pane-focus-nav.ts"
import type { DetailBarId } from "../bmxt-window/detail-bar-focus.ts"
import { isModeToolbarId, type ModeToolbarId } from "../bmxt-window/mode-toolbar-order.ts"

const PANE_FOCUS_VALUES = new Set<string>([
  "terminal",
  "detailBar",
  "tabs",
  "search",
  "dom",
  "setting"
])

export type FloatBrowseStateV1 = {
  v: 1
  navActive: boolean
  navArmedByLeaf: Record<string, boolean>
  paneFocusByLeaf: Record<string, PaneFocusTarget>
  detailBarIdByLeaf: Record<string, DetailBarId | null>
  modeToolbarOrderByLeaf: Record<string, ModeToolbarId[]>
}

export function createEmptyFloatBrowseState(): FloatBrowseStateV1 {
  return {
    v: 1,
    navActive: false,
    navArmedByLeaf: {},
    paneFocusByLeaf: {},
    detailBarIdByLeaf: {},
    modeToolbarOrderByLeaf: {}
  }
}

function isPaneFocusTarget(value: unknown): value is PaneFocusTarget {
  return typeof value === "string" && PANE_FOCUS_VALUES.has(value)
}

function parseBooleanRecord(raw: unknown): Record<string, boolean> {
  if (!raw || typeof raw !== "object") {
    return {}
  }
  const out: Record<string, boolean> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "boolean") {
      out[key] = value
    }
  }
  return out
}

function parsePaneFocusRecord(raw: unknown): Record<string, PaneFocusTarget> {
  if (!raw || typeof raw !== "object") {
    return {}
  }
  const out: Record<string, PaneFocusTarget> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (isPaneFocusTarget(value)) {
      out[key] = value
    }
  }
  return out
}

function parseDetailBarRecord(raw: unknown): Record<string, DetailBarId | null> {
  if (!raw || typeof raw !== "object") {
    return {}
  }
  const out: Record<string, DetailBarId | null> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (value === null) {
      out[key] = null
      continue
    }
    if (isModeToolbarId(value)) {
      out[key] = value
    }
  }
  return out
}

function parseModeToolbarRecord(raw: unknown): Record<string, ModeToolbarId[]> {
  if (!raw || typeof raw !== "object") {
    return {}
  }
  const out: Record<string, ModeToolbarId[]> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(value)) {
      continue
    }
    const order: ModeToolbarId[] = []
    for (const entry of value) {
      if (isModeToolbarId(entry) && !order.includes(entry)) {
        order.push(entry)
      }
    }
    out[key] = order
  }
  return out
}

export function isFloatBrowseStateV1(value: unknown): value is FloatBrowseStateV1 {
  if (!value || typeof value !== "object") {
    return false
  }
  const o = value as Record<string, unknown>
  if (o.v !== 1) {
    return false
  }
  if (typeof o.navActive !== "boolean") {
    return false
  }
  return true
}

export function parseFloatBrowseState(value: unknown): FloatBrowseStateV1 | null {
  if (!isFloatBrowseStateV1(value)) {
    return null
  }
  const o = value as Record<string, unknown>
  return {
    v: 1,
    navActive: o.navActive === true,
    navArmedByLeaf: parseBooleanRecord(o.navArmedByLeaf),
    paneFocusByLeaf: parsePaneFocusRecord(o.paneFocusByLeaf),
    detailBarIdByLeaf: parseDetailBarRecord(o.detailBarIdByLeaf),
    modeToolbarOrderByLeaf: parseModeToolbarRecord(o.modeToolbarOrderByLeaf)
  }
}

function tabKey(tabId: number): string {
  return String(tabId)
}

async function readAll(): Promise<Record<string, FloatBrowseStateV1>> {
  try {
    const raw = await chrome.storage.session.get(FLOAT_BROWSE_STATE_BY_TAB_KEY)
    const bag = raw[FLOAT_BROWSE_STATE_BY_TAB_KEY]
    if (!bag || typeof bag !== "object") {
      return {}
    }
    const out: Record<string, FloatBrowseStateV1> = {}
    for (const [key, value] of Object.entries(bag as Record<string, unknown>)) {
      const parsed = parseFloatBrowseState(value)
      if (parsed !== null) {
        out[key] = parsed
      }
    }
    return out
  } catch {
    return {}
  }
}

async function writeAll(bag: Record<string, FloatBrowseStateV1>): Promise<void> {
  try {
    await chrome.storage.session.set({ [FLOAT_BROWSE_STATE_BY_TAB_KEY]: bag })
  } catch {
    /* session storage unavailable */
  }
}

/**
 * EN: Serialize session-storage read/modify/write so shell vs process-UI patches
 *     cannot clobber each other (e.g. navActive wiped by a stale leaf write).
 */
let browseWriteChain: Promise<void> = Promise.resolve()

function withBrowseBag(
  update: (bag: Record<string, FloatBrowseStateV1>) => void
): Promise<void> {
  const run = browseWriteChain.then(async () => {
    const bag = await readAll()
    update(bag)
    await writeAll(bag)
  })
  browseWriteChain = run.then(
    () => undefined,
    () => undefined
  )
  return run
}

export async function loadFloatBrowseStateForTab(
  tabId: number
): Promise<FloatBrowseStateV1 | null> {
  if (!Number.isInteger(tabId) || tabId < 0) {
    return null
  }
  const bag = await readAll()
  return bag[tabKey(tabId)] ?? null
}

export async function saveFloatBrowseStateForTab(
  tabId: number,
  state: FloatBrowseStateV1
): Promise<void> {
  if (!Number.isInteger(tabId) || tabId < 0) {
    return
  }
  await withBrowseBag((bag) => {
    bag[tabKey(tabId)] = state
  })
}

export type FloatBrowseStatePatch = Partial<Omit<FloatBrowseStateV1, "v">>

export async function patchFloatBrowseStateForTab(
  tabId: number,
  patch: FloatBrowseStatePatch
): Promise<void> {
  if (!Number.isInteger(tabId) || tabId < 0) {
    return
  }
  await withBrowseBag((bag) => {
    const key = tabKey(tabId)
    const prev = bag[key] ?? createEmptyFloatBrowseState()
    bag[key] = {
      ...prev,
      ...patch,
      v: 1
    }
  })
}

export async function clearFloatBrowseStateForTab(tabId: number): Promise<void> {
  if (!Number.isInteger(tabId) || tabId < 0) {
    return
  }
  await withBrowseBag((bag) => {
    delete bag[tabKey(tabId)]
  })
}
