import { displayTitle } from "../format/display-title"
import { resolveTargetTabForActiveWindow } from "../page-dom/resolve-target-tab"
import { serializeNavJumpQueryPayload } from "./nav-jump-match"
import { getNavOverlayLabelsJson } from "./nav-overlay-labels"
import { runNavControlOnTab, type NavControlResult, type NavKeyForward } from "./run-nav-inject"

export type NavPoint = { x: number; y: number }

export type { NavControlResult, NavKeyForward }

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

export async function jumpQueryNavOverlayOnTab(
  tabId: number,
  query: string,
  learned: readonly string[],
  cycleDelta = 0,
  preview = false
): Promise<NavControlResult> {
  const text = serializeNavJumpQueryPayload(query, learned, cycleDelta, preview)
  return runNavControlViaBackground(tabId, "jumpQuery", false, 0, 0, 0, 0, undefined, text)
}

export async function clearNavTypingOnTab(tabId: number): Promise<NavControlResult> {
  return runNavControlViaBackground(tabId, "clearTyping", false, 0, 0)
}

export async function applyNavTypingOnTab(tabId: number, text: string): Promise<NavControlResult> {
  return runNavControlViaBackground(tabId, "applyTyping", false, 0, 0, 0, 0, undefined, text)
}

export async function revertNavTypingOnTab(tabId: number): Promise<NavControlResult> {
  return runNavControlViaBackground(tabId, "revertTyping", false, 0, 0)
}

export async function insertNavTextOnTab(tabId: number, text: string): Promise<NavControlResult> {
  return runNavControlViaBackground(tabId, "insertText", false, 0, 0, 0, 0, undefined, text)
}

export async function deleteNavBackwardOnTab(tabId: number): Promise<NavControlResult> {
  return runNavControlViaBackground(tabId, "deleteBackward", false, 0, 0)
}

export async function deleteNavForwardOnTab(tabId: number): Promise<NavControlResult> {
  return runNavControlViaBackground(tabId, "deleteForward", false, 0, 0)
}

export async function forwardNavKeyOnTab(
  tabId: number,
  forward: NavKeyForward
): Promise<NavControlResult> {
  return runNavControlViaBackground(tabId, "forwardKey", false, 0, 0, 0, 0, forward)
}

export async function toggleNavMenuOnTab(tabId: number): Promise<NavControlResult> {
  return runNavControlViaBackground(tabId, "toggleMenu", false, 0, 0)
}

export type NavMenuInput = "up" | "down" | "left" | "right" | "activate" | "close"

export async function navMenuInputOnTab(
  tabId: number,
  input: NavMenuInput
): Promise<NavControlResult> {
  return runNavControlViaBackground(tabId, "menuInput", false, 0, 0, 0, 0, undefined, input)
}

export async function textSelMarkOnTab(tabId: number): Promise<NavControlResult> {
  return runNavControlViaBackground(tabId, "textSelMark", false, 0, 0)
}

export async function textSelCancelOnTab(tabId: number): Promise<NavControlResult> {
  return runNavControlViaBackground(tabId, "textSelCancel", false, 0, 0)
}

async function runNavControlViaBackground(
  tabId: number,
  action: Parameters<typeof runNavControlOnTab>[1],
  useCenter: boolean,
  x: number,
  y: number,
  dx = 0,
  dy = 0,
  keyForward?: NavKeyForward,
  text?: string
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
      dy,
      key: keyForward?.key,
      code: keyForward?.code,
      ctrlKey: keyForward?.ctrlKey,
      shiftKey: keyForward?.shiftKey,
      altKey: keyForward?.altKey,
      metaKey: keyForward?.metaKey,
      text,
      labelsJson: getNavOverlayLabelsJson()
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
