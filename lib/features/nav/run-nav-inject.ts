/**
 * EN: Run nav overlay control via the service worker — prefer persistent content script,
 *     fall back to `executeScript` when CS is not loaded.
 * JA: SW 経由で nav オーバーレイを制御（常駐 CS 優先、未注入時のみ executeScript）。
 */

import { canScriptHttpHostPages } from "../extension-permissions/optional-http-hosts"
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

/**
 * EN: Prefer the registered content script (works without optional host permission on http(s));
 *     fall back to `executeScript` when CS is not loaded and host access is granted.
 * JA: 常駐 CS を優先（optional host 未許可でも http(s) で可）。CS 未注入時のみ executeScript。
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
  labelsJson?: string
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
    key: k,
    code,
    ctrlKey: keyForward?.ctrlKey,
    shiftKey: keyForward?.shiftKey,
    altKey: keyForward?.altKey,
    metaKey: keyForward?.metaKey,
    text,
    labelsJson: labels
  }

  try {
    const viaCs = await chrome.tabs.sendMessage<NavOverlayMessage, NavInjectResult>(tabId, payload)
    if (viaCs && typeof viaCs === "object" && "ok" in viaCs) {
      return viaCs
    }
  } catch {
    /* content script not loaded — fall through */
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
