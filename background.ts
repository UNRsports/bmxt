/** Service worker: BMXt window launch, shared log, command dispatch. */

import {
  applyChromeEffects,
  type DispatchChromeContext
} from "./lib/features/dispatch"
import {
  BMXT_WINDOW_ID_KEY,
  SESSION_LOG_KEY,
  LAST_NORMAL_WINDOW_KEY,
  SPLIT_SESSION_KEY
} from "./lib/features/extension-storage/keys"
import {
  applySplitDirection,
  appendLinesToPane,
  clearPaneLog,
  loadOrMigrateSplitSession,
  paneCount,
  removePaneFromSession,
  setPaneLog
} from "./lib/features/split"
import {
  ensureBmxtCore,
  runDispatch
} from "./lib/features/wasm-core"

/** Plasmo bundle path for the BMXt UI page. */
const BMXT_PAGE = "tabs/bmxt.html"

let lastFocusedNormalWindow: number | undefined
let bmxtWindowId: number | undefined

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

function openOrFocusBmxtWindow() {
  void openOrFocusBmxtWindowAsync()
}

async function openOrFocusBmxtWindowAsync(): Promise<void> {
  await hydrateBmxtWindowIdFromStorage()
  const url = chrome.runtime.getURL(BMXT_PAGE)
  if (bmxtWindowId === undefined) {
    /* normal: タブグループ API が popup ウィンドウでは無効なため（chrome.tabs.group） */
    const w = await chrome.windows.create({
      url,
      type: "normal",
      width: 780,
      height: 580,
      focused: true
    })
    if (w.id !== undefined) {
      bmxtWindowId = w.id
      await persistBmxtWindowId(w.id)
    }
    return
  }
  try {
    await chrome.windows.get(bmxtWindowId)
    await chrome.windows.update(bmxtWindowId, { focused: true })
  } catch {
    bmxtWindowId = undefined
    await persistBmxtWindowId(undefined)
    await openOrFocusBmxtWindowAsync()
  }
}

chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === bmxtWindowId) {
    bmxtWindowId = undefined
    void persistBmxtWindowId(undefined)
  }
})

chrome.action.onClicked.addListener(() => {
  openOrFocusBmxtWindow()
})

chrome.commands.onCommand.addListener((command) => {
  if (command === "launch-bmxt") {
    openOrFocusBmxtWindow()
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
    if (win.type === "normal") {
      /* BMXt 自体も normal になるため、ここを記録すると「最後の閲覧ウィンドウ」がずれる */
      if (windowId !== bmxtWindowId) {
        rememberNormalWindow(windowId)
      }
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

chrome.runtime.onInstalled.addListener(() => {
  hydrateLastWindowFromStorage()
  void hydrateBmxtWindowIdFromStorage()
})

chrome.runtime.onStartup.addListener(() => {
  hydrateLastWindowFromStorage()
  void hydrateBmxtWindowIdFromStorage()
})

hydrateLastWindowFromStorage()
void hydrateBmxtWindowIdFromStorage()

/** Session log（マルチペイン）を閉じたウィンドウと揃えて消し、BMXt ウィンドウを閉じる。 */
async function exitBmxtWindow(): Promise<string[]> {
  await chrome.storage.local.remove([SPLIT_SESSION_KEY, SESSION_LOG_KEY])
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
  return ["(BMXt window closed, session log cleared)"]
}

async function exitPaneOrWindow(paneId: string): Promise<string[]> {
  const n = await paneCount()
  if (n <= 1) {
    return exitBmxtWindow()
  }
  await removePaneFromSession(paneId)
  return ["(ペインを閉じました)"]
}

async function runCommand(line: string, paneIdMaybe?: string): Promise<void> {
  const trimmed = line.trim()
  if (!trimmed) {
    return
  }
  const session = await loadOrMigrateSplitSession()
  const paneId = paneIdMaybe ?? session.focusedPaneId
  try {
    await ensureBmxtCore()
  } catch (e) {
    if (trimmed.toLowerCase() === "clear") {
      const out: string[] = [`> ${trimmed}`, "(log cleared)"]
      await setPaneLog(paneId, out)
      return
    }
    if (trimmed.toLowerCase() === "exit") {
      const lastPane = (await paneCount()) <= 1
      if (lastPane) {
        await exitBmxtWindow()
      } else {
        await removePaneFromSession(paneId)
      }
      return
    }
    await appendLinesToPane(paneId, [
      `> ${trimmed}`,
      `error: ${e instanceof Error ? e.message : String(e)}`
    ])
    return
  }
  const out: string[] = [`> ${trimmed}`]
  const isExit = trimmed.toLowerCase() === "exit"
  const exitWasLastPane = isExit && (await paneCount()) <= 1
  try {
    out.push(...(await dispatch(trimmed, paneId)))
  } catch (e) {
    out.push(`error: ${e instanceof Error ? e.message : String(e)}`)
  }
  if (trimmed.toLowerCase() === "clear") {
    await setPaneLog(paneId, out)
    return
  }
  if (isExit) {
    if (exitWasLastPane) {
      return
    }
    const sess = await loadOrMigrateSplitSession()
    await appendLinesToPane(sess.focusedPaneId, out)
    return
  }
  await appendLinesToPane(paneId, out)
}

async function dispatch(line: string, paneId: string): Promise<string[]> {
  const bundle = runDispatch(line)
  if (bundle.ty === "lines") {
    return bundle.lines ?? []
  }
  const ctx: DispatchChromeContext = {
    clearLog: async () => {
      await clearPaneLog(paneId)
    },
    exitPane: async () => exitPaneOrWindow(paneId),
    splitRow: async () => applySplitDirection(paneId, "row"),
    splitCol: async () => applySplitDirection(paneId, "col"),
    listWindows,
    focusInfo,
    resolveTabArg
  }
  return applyChromeEffects(ctx, bundle.effects ?? [])
}

const DISPLAY_TITLE_MAX = 96

function displayTitle(raw: string | undefined | null): string {
  const t = (raw || "").trim().replace(/\s+/g, " ")
  if (!t) {
    return "(無題)"
  }
  return t.length > DISPLAY_TITLE_MAX ? `${t.slice(0, DISPLAY_TITLE_MAX)}…` : t
}

/** All windows; label is the active tab title only (no window ids). */
async function listWindows(): Promise<string[]> {
  const wins = await chrome.windows.getAll({ populate: true })
  if (wins.length === 0) {
    return ["(ウィンドウなし)"]
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

chrome.runtime.onMessage.addListener(
  (message: { type?: string; line?: string; paneId?: string }, _sender, sendResponse) => {
    if (message?.type === "RUN_CMD" && typeof message.line === "string") {
      const pid = typeof message.paneId === "string" ? message.paneId : undefined
      runCommand(message.line, pid)
        .then(() => sendResponse({ ok: true }))
        .catch((e) =>
          sendResponse({
            ok: false,
            error: e instanceof Error ? e.message : String(e)
          })
        )
      return true
    }
    return false
  }
)
