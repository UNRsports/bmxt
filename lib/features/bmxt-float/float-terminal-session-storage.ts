/**
 * EN: Per-tab float terminal sessions (survives same-tab navigation; not shared with popup).
 * JA: タブ別フロート・セッション（同一タブ遷移で維持。ポップアップとは別キー）。
 */

import { FLOAT_TERMINAL_BY_TAB_KEY } from "../extension-storage/keys.ts"
import type { TerminalSessionsStateV1 } from "../bmxt-window/terminal-sessions/types.ts"

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
}

export function isTerminalSessionsStateV1(value: unknown): value is TerminalSessionsStateV1 {
  if (!value || typeof value !== "object") {
    return false
  }
  const o = value as Record<string, unknown>
  if (o.v !== 2) {
    return false
  }
  if (!isStringArray(o.order) || o.order.length === 0) {
    return false
  }
  if (typeof o.activeId !== "string" || !o.order.includes(o.activeId)) {
    return false
  }
  if (!o.logsById || typeof o.logsById !== "object") {
    return false
  }
  if (!o.namesById || typeof o.namesById !== "object") {
    return false
  }
  const logsById = o.logsById as Record<string, unknown>
  for (const id of o.order) {
    if (!isStringArray(logsById[id])) {
      return false
    }
  }
  return true
}

function tabKey(tabId: number): string {
  return String(tabId)
}

async function readAll(): Promise<Record<string, TerminalSessionsStateV1>> {
  try {
    const raw = await chrome.storage.session.get(FLOAT_TERMINAL_BY_TAB_KEY)
    const bag = raw[FLOAT_TERMINAL_BY_TAB_KEY]
    if (!bag || typeof bag !== "object") {
      return {}
    }
    const out: Record<string, TerminalSessionsStateV1> = {}
    for (const [key, value] of Object.entries(bag as Record<string, unknown>)) {
      if (isTerminalSessionsStateV1(value)) {
        out[key] = value
      }
    }
    return out
  } catch {
    return {}
  }
}

async function writeAll(bag: Record<string, TerminalSessionsStateV1>): Promise<void> {
  try {
    await chrome.storage.session.set({ [FLOAT_TERMINAL_BY_TAB_KEY]: bag })
  } catch {
    /* session storage unavailable */
  }
}

export async function loadFloatTerminalSessionsForTab(
  tabId: number
): Promise<TerminalSessionsStateV1 | null> {
  if (!Number.isInteger(tabId) || tabId < 0) {
    return null
  }
  const bag = await readAll()
  return bag[tabKey(tabId)] ?? null
}

export async function saveFloatTerminalSessionsForTab(
  tabId: number,
  state: TerminalSessionsStateV1
): Promise<void> {
  if (!Number.isInteger(tabId) || tabId < 0) {
    return
  }
  if (!isTerminalSessionsStateV1(state)) {
    return
  }
  const bag = await readAll()
  bag[tabKey(tabId)] = state
  await writeAll(bag)
}

export async function clearFloatTerminalSessionsForTab(tabId: number): Promise<void> {
  if (!Number.isInteger(tabId) || tabId < 0) {
    return
  }
  const bag = await readAll()
  if (!(tabKey(tabId) in bag)) {
    return
  }
  delete bag[tabKey(tabId)]
  await writeAll(bag)
}
