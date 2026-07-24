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
  removeAllTerminalSessionsFromStorage,
  resetBmxtTerminalSessionsInStorage
} from "../../lib/features/bmxt-window/terminal-sessions/state-storage"
import { broadcastSessionClearToUi } from "../../lib/features/bmxt-window/terminal-sessions/session-runtime-notify"
import type { SessionPatch } from "../../lib/features/bmxt-window/terminal-sessions/session-patches"
import type { RunCmdResult } from "../../lib/features/bmxt-window/terminal-sessions/session-patches"
import { displayTitle } from "../../lib/features/format/display-title"
import { ensureBmxtCore, runDispatch } from "../../lib/features/bmxt-core"
import { loadUiSettings } from "../../lib/features/setting/settings"
import { setRunLocale, getRunLocale } from "../../lib/features/setting/i18n/run-locale"
import type { UiLocale } from "../../lib/features/setting/locale"
import { tWindows } from "../../lib/features/setting/i18n/ns/windows"
import { BACKGROUND_JOB_SCOPE } from "../../lib/features/job/job-types"
import { getJobRunner } from "../../lib/features/job/job-runner"
import { runNavControlOnTab } from "../../lib/features/nav/run-nav-inject"
import type { NavInjectAction } from "../../lib/features/nav/nav-overlay-inject-fn"
import { ensureSearchCacheBackgroundListeners } from "../../lib/features/search/cache/background-listeners"
import {
  clearBmxtWindowIdInMemory,
  hydrateBmxtWindowIdFromStorage,
  persistBmxtWindowId,
  readBmxtWindowIdInMemory
} from "./window-state"
import { hideBmxtFloatOnTabAsync } from "./float-launch"
import {
  resolveExitHostAction,
  resolveHostKindForExit
} from "../../lib/features/bmxt-window/exit-host-policy"
import type { BmxtHostKind } from "../../lib/features/bmxt-window/bmxt-host-kind"

let lastFocusedNormalWindow: number | undefined
let backgroundServicesRegistered = false

function senderTabId(sender?: chrome.runtime.MessageSender): number | undefined {
  const id = sender?.tab?.id
  if (typeof id !== "number" || !Number.isInteger(id)) {
    return undefined
  }
  return id
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

/** EN: Close the BMXt popup window only (never a normal browser window from a float tab). */
async function closeBmxtWindowOnly(): Promise<void> {
  await hydrateBmxtWindowIdFromStorage()
  const wid = readBmxtWindowIdInMemory()
  if (wid !== undefined) {
    await closeBmxtWindowById(wid)
  }
}

async function runExitCommand(
  sessionIdRaw: string | undefined,
  sessionOrderLength: number,
  sender?: chrome.runtime.MessageSender,
  hostKindRaw?: unknown
): Promise<RunCmdResult> {
  const hostKind = resolveHostKindForExit(hostKindRaw, sender)
  const action = resolveExitHostAction({
    hostKind,
    sessionOrderLength,
    senderTabId: senderTabId(sender)
  })

  if (action.kind === "exitSession") {
    const sessionId = sessionIdRaw ?? ""
    return {
      ok: true,
      patches: [{ type: "exitSession", sessionId, appendExitLog: true }]
    }
  }

  if (action.kind === "hideFloat") {
    const tabId = action.tabId ?? senderTabId(sender)
    if (typeof tabId === "number") {
      void hideBmxtFloatOnTabAsync(tabId, { clearSessions: true })
    }
    broadcastSessionClearToUi("float")
    return { ok: true, patches: [] }
  }

  void closeBmxtWindowOnly()
  void removeAllTerminalSessionsFromStorage()
  broadcastSessionClearToUi("popup")
  return { ok: true, patches: [], closeWindow: true }
}

async function runCommand(
  line: string,
  sessionIdRaw: string | undefined,
  sessionOrderLength: number,
  sender?: chrome.runtime.MessageSender,
  localeOverride?: UiLocale,
  hostKind?: BmxtHostKind
): Promise<RunCmdResult> {
  const trimmed = line.trim()
  if (!trimmed) {
    return { ok: true, patches: [] }
  }
  if (trimmed.toLowerCase() === "exit") {
    return runExitCommand(sessionIdRaw, sessionOrderLength, sender, hostKind)
  }
  const runner = getJobRunner(BACKGROUND_JOB_SCOPE)
  return runner.start(
    "run-cmd",
    async () =>
      runCommandBody(trimmed, sessionIdRaw, sessionOrderLength, localeOverride, sender, hostKind),
    { meta: { line: trimmed, sessionId: sessionIdRaw ?? "" }, persist: false }
  )
}

async function runCommandBody(
  line: string,
  sessionIdRaw: string | undefined,
  sessionOrderLength: number,
  localeOverride?: UiLocale,
  sender?: chrome.runtime.MessageSender,
  hostKindRaw?: unknown
): Promise<RunCmdResult> {
  const trimmed = line
  if (/^\s*search\b/i.test(trimmed)) {
    ensureSearchCacheBackgroundListeners()
  }
  const sessionId = sessionIdRaw ?? ""
  const patches: SessionPatch[] = []
  const exitOutcome = { fullClose: false as boolean }
  const hostKind = resolveHostKindForExit(hostKindRaw, sender)

  try {
    await ensureBmxtCore()
  } catch (e) {
    return {
      ok: true,
      patches: [
        {
          type: "appendLog",
          sessionId,
          lines: [`> ${trimmed}`, `error: ${e instanceof Error ? e.message : String(e)}`]
        }
      ]
    }
  }

  const replaceLog = { value: false }
  const more: string[] = []
  try {
    more.push(
      ...(await dispatch(
        trimmed,
        sessionId,
        sessionOrderLength,
        patches,
        exitOutcome,
        localeOverride,
        hostKind,
        sender,
        replaceLog
      ))
    )
  } catch (e) {
    more.push(`error: ${e instanceof Error ? e.message : String(e)}`)
  }

  if (replaceLog.value) {
    patches.push({
      type: "setLog",
      sessionId,
      lines: [`> ${trimmed}`, ...more]
    })
    return { ok: true, patches, closeWindow: exitOutcome.fullClose || undefined }
  }

  patches.push({ type: "appendLog", sessionId, lines: [`> ${trimmed}`] })
  if (more.length > 0) {
    patches.push({ type: "appendLog", sessionId, lines: more })
  }
  return { ok: true, patches, closeWindow: exitOutcome.fullClose || undefined }
}

async function dispatch(
  line: string,
  sessionId: string,
  sessionOrderLength: number,
  sessionPatches: SessionPatch[],
  exitOutcome: { fullClose: boolean },
  localeOverride?: UiLocale,
  hostKind: BmxtHostKind = "popup",
  sender?: chrome.runtime.MessageSender,
  replaceLog?: { value: boolean }
): Promise<string[]> {
  const locale =
    localeOverride ?? (await loadUiSettings()).locale
  setRunLocale(locale)
  const bundle = runDispatch(line, locale)
  if (bundle.ty === "lines") {
    return bundle.lines ?? []
  }
  const ctx: DispatchChromeContext = {
    enqueueSessionPatch: (patch) => {
      sessionPatches.push(patch)
    },
    clearLog: async () => {
      if (replaceLog) {
        replaceLog.value = true
      }
    },
    exitPane: async () => {
      const action = resolveExitHostAction({
        hostKind,
        sessionOrderLength,
        senderTabId: senderTabId(sender)
      })
      if (action.kind === "exitSession") {
        sessionPatches.push({ type: "exitSession", sessionId })
        return []
      }
      if (action.kind === "hideFloat") {
        const tabId = action.tabId ?? senderTabId(sender)
        if (typeof tabId === "number") {
          void hideBmxtFloatOnTabAsync(tabId, { clearSessions: true })
        }
        broadcastSessionClearToUi("float")
        return []
      }
      exitOutcome.fullClose = true
      void closeBmxtWindowOnly()
      void removeAllTerminalSessionsFromStorage()
      broadcastSessionClearToUi("popup")
      return []
    },
    listWindows,
    focusInfo,
    resolveTabArg,
    commandSessionId: sessionId,
    uiLocale: locale
  }
  return applyChromeEffects(ctx, bundle.effects ?? [])
}

async function listWindows(): Promise<string[]> {
  const wins = await chrome.windows.getAll({ populate: true })
  if (wins.length === 0) {
    return [tWindows("windows.none", getRunLocale())]
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
  freeMove?: boolean
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
  broadcastSessionClearToUi("all")
  await openOrFocus()
}

export async function runCommandMessage(
  line: string,
  sessionIdRaw?: string,
  sessionOrderLength?: number,
  sender?: chrome.runtime.MessageSender,
  localeRaw?: string,
  hostKindRaw?: unknown
): Promise<RunCmdResult> {
  const orderLen =
    typeof sessionOrderLength === "number" && Number.isInteger(sessionOrderLength)
      ? Math.max(0, sessionOrderLength)
      : 1
  const sessionId =
    typeof sessionIdRaw === "string" && sessionIdRaw.length > 0 ? sessionIdRaw : undefined
  const localeOverride =
    localeRaw === "en" || localeRaw === "ja" ? localeRaw : undefined
  const hostKind = resolveHostKindForExit(hostKindRaw, sender)
  return runCommand(line, sessionId, orderLen, sender, localeOverride, hostKind)
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
    typeof message.labelsJson === "string" ? message.labelsJson : undefined,
    Boolean(message.freeMove)
  )
}

export function registerBackgroundServices(): void {
  if (backgroundServicesRegistered) {
    return
  }
  backgroundServicesRegistered = true

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

  hydrateLastWindowFromStorage()
  void hydrateBmxtWindowIdFromStorage()
}

;(globalThis as Record<string, unknown>).BmxtBackgroundServices = {
  registerBackgroundServices,
  runCommandMessage,
  runNavControlMessage,
  removeAllTerminalSessionsFromStorageAsync,
  resetBmxtFromShortcutAsync
}
