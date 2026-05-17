import { displayTitle } from "../format/display-title"
import { resolveTargetTabForActiveWindow } from "../page-dom/resolve-target-tab"
import { runNavControlOnTab, type NavControlResult } from "./run-nav-inject"

export type NavPoint = { x: number; y: number }

export type { NavControlResult }

export async function resolveActiveTargetTabId(): Promise<number | undefined> {
  const tab = await resolveTargetTabForActiveWindow()
  return tab?.id
}

export async function resolveTabDisplayTitle(tabId: number): Promise<string> {
  try {
    const tab = await chrome.tabs.get(tabId)
    return displayTitle(tab.title)
  } catch {
    return "(closed)"
  }
}

/** EN: Show overlay; `useCenter` forces viewport center (Alt ON). Runs in the service worker. */
export async function startNavOverlayOnTab(
  tabId: number,
  position: NavPoint | null,
  useCenter: boolean
): Promise<NavControlResult> {
  const x = position?.x ?? -1
  const y = position?.y ?? -1
  return runNavControlViaBackground(tabId, "start", useCenter, x, y)
}

export async function stopNavOverlayOnTab(tabId: number): Promise<void> {
  await runNavControlViaBackground(tabId, "stop", false, 0, 0)
}

export async function moveNavOverlayOnTab(
  tabId: number,
  dx: number,
  dy: number
): Promise<NavControlResult> {
  return runNavControlViaBackground(tabId, "move", false, 0, 0, dx, dy)
}

export async function clickNavOverlayOnTab(tabId: number): Promise<NavControlResult> {
  return runNavControlViaBackground(tabId, "click", false, 0, 0)
}

async function runNavControlViaBackground(
  tabId: number,
  action: "start" | "stop" | "move" | "click",
  useCenter: boolean,
  x: number,
  y: number,
  dx = 0,
  dy = 0
): Promise<NavControlResult> {
  try {
    const res = await chrome.runtime.sendMessage({
      type: "NAV_CONTROL",
      tabId,
      action,
      useCenter,
      x,
      y,
      dx,
      dy
    })
    if (res && typeof res === "object" && "ok" in res) {
      return res as NavControlResult
    }
    return { ok: false, reason: "no-sw-response" }
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    return { ok: false, reason: `sw-message-failed:${detail}` }
  }
}
