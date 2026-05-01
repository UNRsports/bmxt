/** Service worker: BMXt window launch, shared log, command dispatch. */

import {
  applyChromeEffects,
  type DispatchChromeContext
} from "./lib/features/dispatch"
import {
  ensureBmxtCore,
  runDispatch
} from "./lib/features/wasm-core"

const LOG_KEY = "bmxt_log"
const LAST_NORMAL_WINDOW_KEY = "bmxt_last_normal_window"
const MAX_LOG_LINES = 500

/** Plasmo bundle path for the BMXt UI page. */
const BMXT_PAGE = "tabs/bmxt.html"

let lastFocusedNormalWindow: number | undefined
let bmxtWindowId: number | undefined

function openOrFocusBmxtWindow() {
  const url = chrome.runtime.getURL(BMXT_PAGE)
  if (bmxtWindowId === undefined) {
    /* normal: タブグループ API が popup ウィンドウでは無効なため（chrome.tabs.group） */
    chrome.windows.create(
      { url, type: "normal", width: 780, height: 580, focused: true },
      (w) => {
        if (w?.id !== undefined) {
          bmxtWindowId = w.id
        }
      }
    )
    return
  }
  chrome.windows.get(bmxtWindowId, (win) => {
    if (chrome.runtime.lastError || !win) {
      bmxtWindowId = undefined
      openOrFocusBmxtWindow()
      return
    }
    void chrome.windows.update(bmxtWindowId!, { focused: true })
  })
}

chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === bmxtWindowId) {
    bmxtWindowId = undefined
  }
})

chrome.action.onClicked.addListener(() => {
  openOrFocusBmxtWindow()
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
})

chrome.runtime.onStartup.addListener(() => {
  hydrateLastWindowFromStorage()
})

hydrateLastWindowFromStorage()

async function appendLog(lines: string[]): Promise<void> {
  const prev = await chrome.storage.local.get(LOG_KEY)
  const arr = [...((prev[LOG_KEY] as string[] | undefined) ?? []), ...lines]
  const trimmed = arr.slice(-MAX_LOG_LINES)
  await chrome.storage.local.set({ [LOG_KEY]: trimmed })
}

/** Session log を空にし、BMXt ウィンドウを閉じる（`exit` / WASM 失敗時フォールバック）。 */
async function exitBmxtWindow(): Promise<string[]> {
  await chrome.storage.local.set({ [LOG_KEY]: [] })
  const wid = bmxtWindowId
  if (wid !== undefined) {
    try {
      await chrome.windows.remove(wid)
    } catch {
      /* 既に閉じている */
    }
    bmxtWindowId = undefined
  }
  return ["(BMXt window closed, session log cleared)"]
}

async function runCommand(line: string): Promise<void> {
  const trimmed = line.trim()
  if (!trimmed) {
    return
  }
  try {
    await ensureBmxtCore()
  } catch (e) {
    if (trimmed.toLowerCase() === "clear") {
      const out: string[] = [`> ${trimmed}`, "(log cleared)"]
      await chrome.storage.local.set({ [LOG_KEY]: out.slice(-MAX_LOG_LINES) })
      return
    }
    if (trimmed.toLowerCase() === "exit") {
      await exitBmxtWindow()
      return
    }
    await appendLog([
      `> ${trimmed}`,
      `error: ${e instanceof Error ? e.message : String(e)}`
    ])
    return
  }
  const out: string[] = [`> ${trimmed}`]
  try {
    out.push(...(await dispatch(trimmed)))
  } catch (e) {
    out.push(`error: ${e instanceof Error ? e.message : String(e)}`)
  }
  /* clear は clearLog 直後の get が古いログを返すことがあるため、マージせず上書きする */
  if (trimmed.toLowerCase() === "clear") {
    await chrome.storage.local.set({
      [LOG_KEY]: out.slice(-MAX_LOG_LINES)
    })
    return
  }
  if (trimmed.toLowerCase() === "exit") {
    return
  }
  await appendLog(out)
}

async function dispatch(line: string): Promise<string[]> {
  const bundle = runDispatch(line)
  if (bundle.ty === "lines") {
    return bundle.lines ?? []
  }
  const ctx: DispatchChromeContext = {
    clearLog: async () => {
      await chrome.storage.local.set({ [LOG_KEY]: [] })
    },
    exitBmxt: exitBmxtWindow,
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
  (message: { type?: string; line?: string }, _sender, sendResponse) => {
    if (message?.type === "RUN_CMD" && typeof message.line === "string") {
      runCommand(message.line)
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
