/** Service worker: BMXt window launch, per-session logs, command dispatch. */

import {
  applyChromeEffects,
  type DispatchChromeContext
} from "./lib/features/dispatch"
import { BMXT_WINDOW_ID_KEY, LAST_NORMAL_WINDOW_KEY } from "./lib/features/extension-storage/keys"
import {
  appendLinesToSession,
  clearSessionLines,
  exitOrCloseSessionInStorage,
  readTerminalSessionsIfPresent,
  ensureTerminalSessionsState,
  removeAllTerminalSessionsFromStorage,
  resetBmxtTerminalSessionsInStorage,
  setSessionLines,
  resolveSessionId,
  createSessionAndActivate,
  switchSessionNext,
  switchSessionPrev
} from "./lib/features/bmxt-window/terminal-sessions/state-storage"
import { displayTitle } from "./lib/features/format/display-title"
import {
  ensureBmxtCore,
  runDispatch
} from "./lib/features/bmxt-core"
import { buildHelpLines } from "./lib/features/bmxt-core/registry/help"
import { loadUiSettings } from "./lib/features/setting/settings"
import { setRunLocale, getRunLocale } from "./lib/features/setting/i18n/run-locale"
import { t } from "./lib/features/setting/i18n/messages"
import { BACKGROUND_JOB_SCOPE } from "./lib/features/job/job-types.ts"
import { getJobRunner } from "./lib/features/job/job-runner.ts"
import { runNavControlOnTab } from "./lib/features/nav/run-nav-inject"
import type { NavInjectAction } from "./lib/features/nav/nav-overlay-inject-fn"
import { openWelcomePageOnUpdateIfNeeded } from "./lib/features/welcome"
import {
  registerSearchCacheBackgroundListeners,
  warmSearchCachesOnStartup
} from "./lib/features/search/cache/background-listeners"

/** Plasmo bundle path for the BMXt UI page. */
const BMXT_PAGE = "tabs/bmxt.html"

let lastFocusedNormalWindow: number | undefined
let bmxtWindowId: number | undefined
/** 連打で BMXt 窓が複数できるのを防ぐ。 */
let bmxtWindowLaunchChain: Promise<void> = Promise.resolve()

async function persistBmxtWindowId(id: number | undefined): Promise<void> {
  if (id === undefined) {
    await chrome.storage.local.remove(BMXT_WINDOW_ID_KEY)
    return
  }
  await chrome.storage.local.set({ [BMXT_WINDOW_ID_KEY]: id })
}

/** SW が sleep しても既存 BMXt 窓を追えるよう、保存済み ID をメモリに戻す。 */
async function hydrateBmxtWindowIdFromStorage(): Promise<void> {
  if (bmxtWindowId !== undefined) {
    return
  }
  const r = await chrome.storage.local.get(BMXT_WINDOW_ID_KEY)
  const id = r[BMXT_WINDOW_ID_KEY]
  if (typeof id === "number" && Number.isInteger(id)) {
    bmxtWindowId = id
  }
}

/** 保存 ID が無効なときは bmxt.html タブから窓 ID を復元する。 */
async function resolveBmxtWindowIdAsync(): Promise<number | undefined> {
  await hydrateBmxtWindowIdFromStorage()
  if (bmxtWindowId !== undefined) {
    try {
      await chrome.windows.get(bmxtWindowId)
      return bmxtWindowId
    } catch {
      bmxtWindowId = undefined
      await persistBmxtWindowId(undefined)
    }
  }
  const pageUrl = chrome.runtime.getURL(BMXT_PAGE)
  const tabs = await chrome.tabs.query({ url: pageUrl })
  const tab = tabs.find((t) => typeof t.windowId === "number")
  if (tab?.windowId === undefined) {
    return undefined
  }
  bmxtWindowId = tab.windowId
  await persistBmxtWindowId(tab.windowId)
  return tab.windowId
}

async function focusBmxtWindow(windowId: number): Promise<void> {
  await chrome.windows.update(windowId, { focused: true })
}

function enqueueBmxtWindowLaunch(task: () => Promise<void>): void {
  bmxtWindowLaunchChain = bmxtWindowLaunchChain.then(task, task)
  void bmxtWindowLaunchChain
}

function openOrFocusBmxtWindow() {
  enqueueBmxtWindowLaunch(() => openOrFocusBmxtWindowAsync())
}

async function openOrFocusBmxtWindowAsync(): Promise<void> {
  const existingId = await resolveBmxtWindowIdAsync()
  if (existingId !== undefined) {
    await focusBmxtWindow(existingId)
    return
  }
  /* popup: タブバーなしの単一ページ窓（BMXt シェル専用） */
  const url = chrome.runtime.getURL(BMXT_PAGE)
  const w = await chrome.windows.create({
    url,
    type: "popup",
    width: 780,
    height: 580,
    focused: true
  })
  if (w.id !== undefined) {
    bmxtWindowId = w.id
    await persistBmxtWindowId(w.id)
  }
}

chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === bmxtWindowId) {
    bmxtWindowId = undefined
    void persistBmxtWindowId(undefined)
    /* × 閉じも最後の exit と同様: ログ等は消すが bmxt_cmd_history は残す */
    void removeAllTerminalSessionsFromStorage()
  }
})

chrome.action.onClicked.addListener(() => {
  openOrFocusBmxtWindow()
})

/** ショートカット: 既に BMXt 窓があれば最前面へ。無ければ初期化して 1 枚だけ開く。 */
async function launchBmxtFromShortcutAsync(): Promise<void> {
  const existingId = await resolveBmxtWindowIdAsync()
  if (existingId !== undefined) {
    await focusBmxtWindow(existingId)
    return
  }
  await ensureTerminalSessionsState()
  await openOrFocusBmxtWindowAsync()
}

/** ショートカット: ターミナルを初期状態に戻し、BMXt 窓を開く／最前面へ（1 枚に統一）。 */
async function resetBmxtFromShortcutAsync(): Promise<void> {
  await resetBmxtTerminalSessionsInStorage()
  await openOrFocusBmxtWindowAsync()
}

chrome.commands.onCommand.addListener((command) => {
  if (command === "launch-bmxt") {
    enqueueBmxtWindowLaunch(() => launchBmxtFromShortcutAsync())
    return
  }
  if (command === "reset-bmxt") {
    enqueueBmxtWindowLaunch(() => resetBmxtFromShortcutAsync())
  }
})

function rememberNormalWindow(windowId: number) {
  lastFocusedNormalWindow = windowId
  void chrome.storage.local.set({ [LAST_NORMAL_WINDOW_KEY]: windowId })
}

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    return
  }
  chrome.windows.get(windowId, (win) => {
    if (chrome.runtime.lastError || !win) {
      return
    }
    if (win.type === "normal" && windowId !== bmxtWindowId) {
      rememberNormalWindow(windowId)
    }
  })
})

function hydrateLastWindowFromStorage() {
  chrome.storage.local.get(LAST_NORMAL_WINDOW_KEY, (r) => {
    const id = r[LAST_NORMAL_WINDOW_KEY]
    if (typeof id === "number" && Number.isInteger(id)) {
      lastFocusedNormalWindow = id
    }
  })
}

chrome.runtime.onInstalled.addListener((details) => {
  hydrateLastWindowFromStorage()
  void hydrateBmxtWindowIdFromStorage()
  void openWelcomePageOnUpdateIfNeeded(details)
  warmSearchCachesOnStartup()
})

chrome.runtime.onStartup.addListener(() => {
  hydrateLastWindowFromStorage()
  void hydrateBmxtWindowIdFromStorage()
  warmSearchCachesOnStartup()
})

registerSearchCacheBackgroundListeners()
warmSearchCachesOnStartup()

hydrateLastWindowFromStorage()
void hydrateBmxtWindowIdFromStorage()

/**
 * WASM 未ロード時でも効かせるコマンド（レイアウト・終了・ログ消去）。
 * 他はエラー行を出す。
 */
async function tryRunCommandWithoutWasm(sessionId: string, trimmed: string): Promise<boolean> {
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

async function closeBmxtWindowOnly(): Promise<void> {
  const wid = bmxtWindowId
  if (wid !== undefined) {
    try {
      await chrome.windows.remove(wid)
    } catch {
      /* 既に閉じている */
    }
    bmxtWindowId = undefined
    await persistBmxtWindowId(undefined)
  }
}

/** 全セッションを消して BMXt ウィンドウを閉じる（WASM 未ロード時の exit など）。 */
async function exitBmxtWindowFull(): Promise<string[]> {
  await removeAllTerminalSessionsFromStorage()
  await closeBmxtWindowOnly()
  return ["(BMXt window closed, session log cleared)"]
}

async function runCommand(line: string, sessionIdRaw?: string): Promise<void> {
  const trimmed = line.trim()
  if (!trimmed) {
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
  const isExit = trimmed.toLowerCase() === "exit"
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
  if (isExit) {
    if (!exitOutcome.fullClose) {
      const peek = await readTerminalSessionsIfPresent()
      if (peek) {
        await appendLinesToSession(peek.activeId, [`> ${trimmed}`, ...more])
      }
    }
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

/** All windows; label is the active tab title only (no window ids). */
async function listWindows(): Promise<string[]> {
  const wins = await chrome.windows.getAll({ populate: true })
  if (wins.length === 0) {
    return [t("windows.none", getRunLocale())]
  }
  return wins.map((w) => {
    const f = w.focused ? "*" : " "
    const tabs = w.tabs ?? []
    const active = tabs.find((t) => t.active) ?? tabs[0]
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
    lines.push(`getLastFocused: window ${win.id}, type=${win.type}, focused=${win.focused}`)
  } catch (e) {
    lines.push(`getLastFocused: error ${e instanceof Error ? e.message : String(e)}`)
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

/** Active tab in the window Chrome considers last-focused (works when BMXt window has focus). */
async function activeTabFromGetLastFocused(): Promise<chrome.tabs.Tab | undefined> {
  try {
    const win = await chrome.windows.getLastFocused({ populate: true })
    if (win.type !== "normal" || !win.tabs?.length) {
      return undefined
    }
    return win.tabs.find((t) => t.active) ?? win.tabs[0]
  } catch {
    return undefined
  }
}

async function resolveTabArg(
  tabIdStr: string | undefined
): Promise<chrome.tabs.Tab | undefined> {
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

chrome.runtime.onMessage.addListener(
  (
    message: { type?: string; line?: string; sessionId?: string } & NavControlRequest,
    _sender,
    sendResponse
  ) => {
    if (message?.type === "RUN_CMD" && typeof message.line === "string") {
      runCommand(message.line, message.sessionId)
        .then(() => sendResponse({ ok: true }))
        .catch((e) =>
          sendResponse({
            ok: false,
            error: e instanceof Error ? e.message : String(e)
          })
        )
      return true
    }
    if (message?.type === "NAV_CONTROL" && typeof message.tabId === "number") {
      const action = message.action ?? "start"
      void runNavControlOnTab(
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
        .then((result) => sendResponse(result))
        .catch((e) =>
          sendResponse({
            ok: false,
            reason: e instanceof Error ? e.message : String(e)
          })
        )
      return true
    }
    return false
  }
)
