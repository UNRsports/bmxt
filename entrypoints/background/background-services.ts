/**
 * EN: Heavy background services (command dispatch, nav, search listeners). Loaded via importScripts.
 * JA: コマンド dispatch 等の重い SW 処理。importScripts で読み込む。
 */

import {
  applyChromeEffects,
  type DispatchChromeContext
} from "../../lib/features/dispatch"
import { LAST_NORMAL_WINDOW_KEY } from "../../lib/features/extension-storage/keys"
import {
  appendLinesToSession,
  clearSessionLines,
  exitOrCloseSessionInStorage,
  readTerminalSessionsIfPresent,
  ensureTerminalSessionsState,
  removeAllTerminalSessionsFromStorage,
  setSessionLines,
  resolveSessionId,
  createSessionAndActivate,
  switchSessionNext,
  switchSessionPrev,
  resetBmxtTerminalSessionsInStorage
} from "../../lib/features/bmxt-window/terminal-sessions/state-storage"
import { displayTitle } from "../../lib/features/format/display-title"
import { ensureBmxtCore, runDispatch } from "../../lib/features/bmxt-core"
import { buildHelpLines } from "../../lib/features/bmxt-core/registry/help"
import { loadUiSettings } from "../../lib/features/setting/settings"
import { setRunLocale, getRunLocale } from "../../lib/features/setting/i18n/run-locale"
import { t } from "../../lib/features/setting/i18n/messages"
import { BACKGROUND_JOB_SCOPE } from "../../lib/features/job/job-types"
import { getJobRunner } from "../../lib/features/job/job-runner"
import { runNavControlOnTab } from "../../lib/features/nav/run-nav-inject"
import type { NavInjectAction } from "../../lib/features/nav/nav-overlay-inject-fn"
import { openWelcomePageOnUpdateIfNeeded } from "../../lib/features/welcome"
import { registerSearchCacheBackgroundListeners } from "../../lib/features/search/cache/background-listeners"
import {
  scheduleDeferredWarmSearchCachesForLifecycle,
  ensureWarmSearchCachesStarted
} from "../../lib/features/launch/warm-search-scheduler"
import {
  clearBmxtWindowIdInMemory,
  hydrateBmxtWindowIdFromStorage,
  persistBmxtWindowId,
  readBmxtWindowIdInMemory
} from "./window-state"

let lastFocusedNormalWindow: number | undefined
let commandCoreWarmed = false

function senderWindowId(sender?: chrome.runtime.MessageSender): number | undefined {
  const tab = sender?.tab
  if (!tab || typeof tab.windowId !== "number") {
    return undefined
  }
  return tab.windowId
}

async function closeBmxtWindowById(windowId: number): Promise<void> {
  try {
    await chrome.windows.remove(windowId)
  } catch {
    /* already closed */
  }
  if (readBmxtWindowIdInMemory() === windowId) {
    clearBmxtWindowIdInMemory()
    void persistBmxtWindowId(undefined)
  }
}

async function closeBmxtWindowOnly(hintWindowId?: number): Promise<void> {
  if (hintWindowId !== undefined) {
    await closeBmxtWindowById(hintWindowId)
    return
  }
  await hydrateBmxtWindowIdFromStorage()
  const wid = readBmxtWindowIdInMemory()
  if (wid !== undefined) {
    await closeBmxtWindowById(wid)
  }
}

async function tryRunCommandWithoutWasm(
  sessionId: string,
  trimmed: string
): Promise<boolean> {
  const lower = trimmed.toLowerCase()
  if (lower === "clear") {
    await setSessionLines(sessionId, [`> ${trimmed}`, "(log cleared)"])
    return true
  }
  if (lower === "exit") {
    await exitBmxtWindowFull()
    return true
  }
  const newMatch = trimmed.match(/^\s*session\s+-new(?:\s+(.+))?\s*$/i)
  if (newMatch) {
    const rawName = (newMatch[1] ?? "").trim()
    await createSessionAndActivate(sessionId, {
      name: rawName.length > 0 ? rawName : undefined
    })
    await appendLinesToSession(sessionId, [`> ${trimmed}`])
    return true
  }
  if (/^\s*session\s+-next\s*$/i.test(trimmed)) {
    await switchSessionNext(sessionId)
    await appendLinesToSession(sessionId, [`> ${trimmed}`])
    return true
  }
  if (/^\s*session\s+-prev\s*$/i.test(trimmed)) {
    await switchSessionPrev(sessionId)
    await appendLinesToSession(sessionId, [`> ${trimmed}`])
    return true
  }
  return false
}

async function exitBmxtWindowFull(hintWindowId?: number): Promise<string[]> {
  void closeBmxtWindowOnly(hintWindowId)
  void removeAllTerminalSessionsFromStorage()
  return ["(BMXt window closed, session log cleared)"]
}

async function runExitCommand(
  sessionIdRaw?: string,
  sender?: chrome.runtime.MessageSender
): Promise<void> {
  const hintWindowId = senderWindowId(sender)
  const st = await readTerminalSessionsIfPresent()
  const isLastOrEmpty = !st || st.order.length <= 1

  if (isLastOrEmpty) {
    void closeBmxtWindowOnly(hintWindowId)
    void removeAllTerminalSessionsFromStorage()
    return
  }

  const st0 = await ensureTerminalSessionsState()
  const sessionId = resolveSessionId(st0, sessionIdRaw)
  const r = await exitOrCloseSessionInStorage(sessionId)
  if (r.fullClose) {
    void closeBmxtWindowOnly(hintWindowId)
    return
  }
  if ("activeIdAfter" in r) {
    await appendLinesToSession(r.activeIdAfter, [`> exit`])
  }
}

async function runCommand(
  line: string,
  sessionIdRaw?: string,
  sender?: chrome.runtime.MessageSender
): Promise<void> {
  const trimmed = line.trim()
  if (!trimmed) {
    return
  }
  if (trimmed.toLowerCase() === "exit") {
    await runExitCommand(sessionIdRaw, sender)
    return
  }
  const runner = getJobRunner(BACKGROUND_JOB_SCOPE)
  await runner.start(
    "run-cmd",
    async () => {
      await runCommandBody(trimmed, sessionIdRaw)
    },
    { meta: { line: trimmed, sessionId: sessionIdRaw ?? "" }, persist: false }
  )
}

async function runCommandBody(line: string, sessionIdRaw?: string): Promise<void> {
  const trimmed = line
  if (/^\s*search\b/i.test(trimmed)) {
    ensureWarmSearchCachesStarted()
  }
  const st0 = await ensureTerminalSessionsState()
  const sessionId = resolveSessionId(st0, sessionIdRaw)

  const exitOutcome = { fullClose: false as boolean }

  try {
    await ensureBmxtCore()
  } catch (e) {
    if (await tryRunCommandWithoutWasm(sessionId, trimmed)) {
      return
    }
    await appendLinesToSession(sessionId, [
      `> ${trimmed}`,
      `error: ${e instanceof Error ? e.message : String(e)}`
    ])
    return
  }
  const isClear = trimmed.toLowerCase() === "clear"
  if (!isClear) {
    await appendLinesToSession(sessionId, [`> ${trimmed}`])
  }
  const more: string[] = []
  try {
    more.push(...(await dispatch(trimmed, sessionId, exitOutcome)))
  } catch (e) {
    more.push(`error: ${e instanceof Error ? e.message : String(e)}`)
  }
  if (isClear) {
    await setSessionLines(sessionId, [`> ${trimmed}`, ...more])
    return
  }
  if (more.length > 0) {
    await appendLinesToSession(sessionId, more)
  }
}

async function dispatch(
  line: string,
  sessionId: string,
  exitOutcome: { fullClose: boolean }
): Promise<string[]> {
  const { locale } = await loadUiSettings()
  setRunLocale(locale)
  const trimmed = line.trim()
  if (trimmed === "help" || trimmed === "?") {
    return buildHelpLines(locale)
  }
  const bundle = runDispatch(line, locale)
  if (bundle.ty === "lines") {
    return bundle.lines ?? []
  }
  const ctx: DispatchChromeContext = {
    clearLog: async () => {
      await clearSessionLines(sessionId)
    },
    exitPane: async () => {
      const r = await exitOrCloseSessionInStorage(sessionId)
      exitOutcome.fullClose = r.fullClose
      if (r.fullClose) {
        await closeBmxtWindowOnly()
      }
      return []
    },
    listWindows,
    focusInfo,
    resolveTabArg,
    commandSessionId: sessionId
  }
  return applyChromeEffects(ctx, bundle.effects ?? [])
}

async function listWindows(): Promise<string[]> {
  const wins = await chrome.windows.getAll({ populate: true })
  if (wins.length === 0) {
    return [t("windows.none", getRunLocale())]
  }
  return wins.map((w) => {
    const f = w.focused ? "*" : " "
    const tabs = w.tabs ?? []
    const active = tabs.find((tab) => tab.active) ?? tabs[0]
    return `${f}${displayTitle(active?.title)}`
  })
}

async function focusInfo(): Promise<string[]> {
  const fromMemory = lastFocusedNormalWindow
  const fromDisk = await chrome.storage.local.get(LAST_NORMAL_WINDOW_KEY)
  const stored = fromDisk[LAST_NORMAL_WINDOW_KEY] as number | undefined
  const lines = [
    `in-memory last normal window: ${fromMemory ?? "(none)"}`,
    `stored last normal window: ${typeof stored === "number" ? stored : "(none)"}`
  ]
  try {
    const win = await chrome.windows.getLastFocused({ populate: false })
    lines.push(
      `getLastFocused: window ${win.id}, type=${win.type}, focused=${win.focused}`
    )
  } catch (e) {
    lines.push(
      `getLastFocused: error ${e instanceof Error ? e.message : String(e)}`
    )
  }
  return lines
}

async function resolvedNormalWindowId(): Promise<number | undefined> {
  if (lastFocusedNormalWindow !== undefined) {
    return lastFocusedNormalWindow
  }
  const r = await chrome.storage.local.get(LAST_NORMAL_WINDOW_KEY)
  const id = r[LAST_NORMAL_WINDOW_KEY] as number | undefined
  if (typeof id === "number" && Number.isInteger(id)) {
    lastFocusedNormalWindow = id
    return id
  }
  return undefined
}

async function activeTabFromGetLastFocused(): Promise<chrome.tabs.Tab | undefined> {
  try {
    const win = await chrome.windows.getLastFocused({ populate: true })
    if (win.type !== "normal" || !win.tabs?.length) {
      return undefined
    }
    return win.tabs.find((tab) => tab.active) ?? win.tabs[0]
  } catch {
    return undefined
  }
}

async function resolveTabArg(tabIdStr: string | undefined): Promise<chrome.tabs.Tab | undefined> {
  if (tabIdStr !== undefined && tabIdStr !== "") {
    const id = Number(tabIdStr)
    if (Number.isInteger(id)) {
      try {
        return await chrome.tabs.get(id)
      } catch {
        return undefined
      }
    }
    return undefined
  }
  const wId = await resolvedNormalWindowId()
  if (wId !== undefined) {
    const tabs = await chrome.tabs.query({ windowId: wId, active: true })
    if (tabs[0]) {
      return tabs[0]
    }
  }
  return activeTabFromGetLastFocused()
}

type NavControlRequest = {
  type?: string
  tabId?: number
  action?: NavInjectAction
  useCenter?: boolean
  x?: number
  y?: number
  dx?: number
  dy?: number
  key?: string
  code?: string
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  metaKey?: boolean
  text?: string
  labelsJson?: string
}

function rememberNormalWindow(windowId: number) {
  lastFocusedNormalWindow = windowId
  void chrome.storage.local.set({ [LAST_NORMAL_WINDOW_KEY]: windowId })
}

function hydrateLastWindowFromStorage() {
  chrome.storage.local.get(LAST_NORMAL_WINDOW_KEY, (r) => {
    const id = r[LAST_NORMAL_WINDOW_KEY]
    if (typeof id === "number" && Number.isInteger(id)) {
      lastFocusedNormalWindow = id
    }
  })
}

export async function removeAllTerminalSessionsFromStorageAsync(): Promise<void> {
  await removeAllTerminalSessionsFromStorage()
}

export async function resetBmxtFromShortcutAsync(
  openOrFocus: () => Promise<void>
): Promise<void> {
  await resetBmxtTerminalSessionsInStorage()
  await openOrFocus()
}

export async function warmBackgroundServicesAsync(): Promise<void> {
  if (commandCoreWarmed) {
    return
  }
  await ensureBmxtCore()
  getJobRunner(BACKGROUND_JOB_SCOPE)
  commandCoreWarmed = true
}

export async function runCommandMessage(
  line: string,
  sessionIdRaw?: string,
  sender?: chrome.runtime.MessageSender
): Promise<void> {
  await runCommand(line, sessionIdRaw, sender)
}

export async function runNavControlMessage(message: NavControlRequest): Promise<unknown> {
  if (typeof message.tabId !== "number") {
    return { ok: false, reason: "missing tabId" }
  }
  const action = message.action ?? "start"
  return runNavControlOnTab(
    message.tabId,
    action,
    Boolean(message.useCenter),
    message.x ?? -1,
    message.y ?? -1,
    message.dx ?? 0,
    message.dy ?? 0,
    message.key != null
      ? {
          key: String(message.key),
          code: String(message.code ?? message.key),
          ctrlKey: Boolean(message.ctrlKey),
          shiftKey: Boolean(message.shiftKey),
          altKey: Boolean(message.altKey),
          metaKey: Boolean(message.metaKey)
        }
      : undefined,
    typeof message.text === "string" ? message.text : undefined,
    typeof message.labelsJson === "string" ? message.labelsJson : undefined
  )
}

export function registerBackgroundServices(): void {
  chrome.windows.onFocusChanged.addListener((windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
      return
    }
    chrome.windows.get(windowId, (win) => {
      if (chrome.runtime.lastError || !win) {
        return
      }
      if (win.type === "normal") {
        void hydrateBmxtWindowIdFromStorage().then(() => {
          if (windowId !== readBmxtWindowIdInMemory()) {
            rememberNormalWindow(windowId)
          }
        })
      }
    })
  })

  chrome.runtime.onInstalled.addListener((details) => {
    hydrateLastWindowFromStorage()
    void hydrateBmxtWindowIdFromStorage()
    void openWelcomePageOnUpdateIfNeeded(details)
    scheduleDeferredWarmSearchCachesForLifecycle("install")
  })

  chrome.runtime.onStartup.addListener(() => {
    hydrateLastWindowFromStorage()
    void hydrateBmxtWindowIdFromStorage()
    scheduleDeferredWarmSearchCachesForLifecycle("browser-startup")
  })

  registerSearchCacheBackgroundListeners()
  hydrateLastWindowFromStorage()
  void hydrateBmxtWindowIdFromStorage()
}
