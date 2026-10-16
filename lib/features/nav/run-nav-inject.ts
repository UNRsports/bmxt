/**
 * EN: Run nav overlay control via the service worker — prefer persistent content script
 *     (ensure/re-inject without page reload), fall back to `executeScript` when needed.
 * JA: SW 経由で nav オーバーレイを制御（ensure で CS 再注入、必要時のみ executeScript）。
 */

import { canScriptHttpHostPages } from "../extension-permissions/optional-http-hosts"
import { ensurePageContentScript } from "../page-scripting/ensure-content-script"
import { isScriptablePageUrl } from "../url/is-scriptable-page-url"
import {
  bmxtNavControlInjected,
  NAV_OVERLAY_CHANNEL,
  type NavInjectAction,
  type NavInjectResult,
  type NavOverlayMessage
} from "./nav-overlay-inject-fn"
import { getNavOverlayLabelsJson } from "./nav-overlay-labels"

export type NavControlResult = NavInjectResult
export type { NavOverlayMessage }

export type NavKeyForward = {
  key: string
  code: string
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  metaKey: boolean
}

async function tabUrlOk(tabId: number): Promise<boolean> {
  try {
    const tab = await chrome.tabs.get(tabId)
    return isScriptablePageUrl(tab.url)
  } catch {
    return false
  }
}

async function ensureHostAccess(): Promise<"ok" | "denied" | "not-scriptable"> {
  if (!(await canScriptHttpHostPages())) {
    return "denied"
  }
  return "ok"
}

async function sendNavViaContentScript(
  tabId: number,
  payload: NavOverlayMessage
): Promise<NavControlResult | null> {
  try {
    const viaCs = await chrome.tabs.sendMessage<NavOverlayMessage, NavInjectResult>(tabId, payload)
    if (viaCs && typeof viaCs === "object" && "ok" in viaCs) {
      return viaCs
    }
  } catch {
    /* content script not loaded */
  }
  return null
}

/**
 * EN: Prefer the registered content script; ensure/re-inject if missing; then func fallback.
 * JA: 常駐 CS を優先。未注入なら ensure で再注入し、それでもだめなら executeScript(func)。
 */
export async function runNavControlOnTab(
  tabId: number,
  action: NavInjectAction,
  useCenter: boolean,
  x: number,
  y: number,
  dx = 0,
  dy = 0,
  keyForward?: NavKeyForward,
  text?: string,
  labelsJson?: string,
  freeMove = false
): Promise<NavControlResult> {
  if (!(await tabUrlOk(tabId))) {
    return { ok: false, reason: "not-scriptable" }
  }

  const k = keyForward?.key ?? ""
  const code = keyForward?.code ?? ""
  const labels = labelsJson ?? getNavOverlayLabelsJson()
  const payload: NavOverlayMessage = {
    channel: NAV_OVERLAY_CHANNEL,
    action,
    useCenter,
    x,
    y,
    dx,
    dy,
    freeMove: freeMove || undefined,
    key: k,
    code,
    ctrlKey: keyForward?.ctrlKey,
    shiftKey: keyForward?.shiftKey,
    altKey: keyForward?.altKey,
    metaKey: keyForward?.metaKey,
    text,
    labelsJson: labels
  }

  const first = await sendNavViaContentScript(tabId, payload)
  if (first) {
    return first
  }

  if (await ensurePageContentScript(tabId)) {
    const second = await sendNavViaContentScript(tabId, payload)
    if (second) {
      return second
    }
  }

  const gate = await ensureHostAccess()
  if (gate === "denied") {
    return { ok: false, reason: "permission-denied" }
  }

  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: bmxtNavControlInjected,
      args: [
        action,
        useCenter ? 1 : 0,
        x,
        y,
        dx,
        dy,
        freeMove ? 1 : 0,
        k,
        code,
        keyForward?.ctrlKey ? 1 : 0,
        keyForward?.shiftKey ? 1 : 0,
        keyForward?.altKey ? 1 : 0,
        keyForward?.metaKey ? 1 : 0,
        text ?? "",
        labels
      ]
    })
    return (result as NavInjectResult | undefined) ?? { ok: false, reason: "no-result" }
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    return { ok: false, reason: `inject-failed:${detail}` }
  }
}
