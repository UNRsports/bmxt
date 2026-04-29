/** Service worker: BMXt window launch, shared log, command dispatch. */

import {
  buildHelpLines,
  getManLines,
  listManTopics,
  resolveCommand
} from "./lib/commands-meta"
import type { CommandContext } from "./lib/commands/types"

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

async function runCommand(line: string): Promise<void> {
  const trimmed = line.trim()
  if (!trimmed) {
    return
  }
  const out: string[] = [`> ${trimmed}`]
  try {
    out.push(...(await dispatch(trimmed)))
  } catch (e) {
    out.push(`error: ${e instanceof Error ? e.message : String(e)}`)
  }
  await appendLog(out)
}

function tokenize(line: string): string[] {
  return line
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

async function dispatch(line: string): Promise<string[]> {
  const urlNav = await tryNavigateUrlLine(line)
  if (urlNav) {
    return urlNav
  }
  const args = tokenize(line)
  const cmd = args[0]?.toLowerCase()
  if (!cmd) {
    return []
  }
  const command = resolveCommand(cmd)
  if (!command) {
    return [`unknown command: ${cmd}. Type help.`]
  }
  const ctx: CommandContext = {
    clearLog: async () => {
      await chrome.storage.local.set({ [LOG_KEY]: [] })
    },
    listWindows,
    focusInfo,
    resolveTabArg,
    getHelpLines: buildHelpLines,
    listManTopics,
    getManLines
  }
  return command.execute(ctx, args, line)
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

function parseHttpUrlCandidate(inner: string): string | null {
  const t = inner.trim()
  if (!t || /\s/.test(t)) {
    return null
  }
  if (!/^https?:\/\//i.test(t)) {
    return null
  }
  try {
    const u = new URL(t)
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return null
    }
    return u.href
  } catch {
    return null
  }
}

/** http(s) URL as a full line: new tab, current tab, or new window. */
async function tryNavigateUrlLine(line: string): Promise<string[] | null> {
  const trimmed = line.trim()
  const nw = /^(.+?)\s+-nw$/i.exec(trimmed)
  if (nw) {
    const url = parseHttpUrlCandidate(nw[1] ?? "")
    if (url) {
      const w = await chrome.windows.create({ url })
      return [`opened new window ${w.id}: ${url}`]
    }
  }
  const cur = /^(.+?)\s+\.$/.exec(trimmed)
  if (cur) {
    const url = parseHttpUrlCandidate(cur[1] ?? "")
    if (url) {
      const tab = await resolveTabArg(undefined)
      if (!tab?.id) {
        return ["no target tab for current navigation (focus a normal window with a page)"]
      }
      await chrome.tabs.update(tab.id, { url })
      return [`navigated tab ${tab.id}: ${url}`]
    }
  }
  const bare = parseHttpUrlCandidate(trimmed)
  if (bare && !/\s/.test(trimmed)) {
    const t = await chrome.tabs.create({ url: bare })
    return [`opened new tab ${t.id}: ${bare}`]
  }
  return null
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
