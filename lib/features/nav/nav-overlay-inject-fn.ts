/**
 * EN: Injected function for `chrome.scripting.executeScript` — must live in the SW bundle
 *     with the caller (`run-nav-inject.ts`). No imports/exports on the function itself.
 * JA: `executeScript` 用。import/export 不可の単体関数。
 */

export type NavInjectAction = "start" | "stop" | "move" | "click"

export type NavInjectResult =
  | { ok: true; x: number; y: number }
  | { ok: false; reason?: string }

/** Keep in sync with `contents/bmxt-nav-overlay.ts`. */
export const NAV_OVERLAY_CHANNEL = "bmxt-nav-v1"

export type NavOverlayMessage = {
  channel: typeof NAV_OVERLAY_CHANNEL
  action: NavInjectAction
  useCenter: boolean
  x: number
  y: number
  dx: number
  dy: number
}

export function bmxtNavControlInjected(
  action: string,
  useCenter: number,
  x: number,
  y: number,
  dx: number,
  dy: number
): NavInjectResult {
  const ROOT_ID = "__bmxt_nav_cursor_root__"
  const NAV_CURSOR_SCALE = 1.1

  type NavSession = { x: number; y: number; root: HTMLDivElement }

  function sessionWin(): { bmxtNav?: NavSession } {
    return window as unknown as { bmxtNav?: NavSession }
  }

  function clampCoord(value: number, max: number): number {
    return Math.max(0, Math.min(value, max))
  }

  function viewportCenter(): { x: number; y: number } {
    return {
      x: Math.round(window.innerWidth / 2),
      y: Math.round(window.innerHeight / 2)
    }
  }

  function removeSession(): void {
    const w = sessionWin()
    const cur = w.bmxtNav
    if (cur) {
      cur.root.remove()
    }
    delete w.bmxtNav
    const stray = document.getElementById(ROOT_ID)
    if (stray) {
      stray.remove()
    }
  }

  function pointerSvgMarkup(): string {
    const w = Math.round(16 * NAV_CURSOR_SCALE)
    const h = Math.round(22 * NAV_CURSOR_SCALE)
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" width="' +
      w +
      '" height="' +
      h +
      '" viewBox="0 0 16 22" aria-hidden="true" style="display:block;filter:drop-shadow(0 0 2px #000)">' +
      '<path fill="#fff" stroke="#111" stroke-width="1.1" d="M1 1 L1 19 L5.5 14.5 L9 21 L11.5 19.5 L8 13 L14 13 Z"/>' +
      "</svg>"
    )
  }

  function installAt(px: number, py: number): NavInjectResult {
    removeSession()
    const maxX = Math.max(0, window.innerWidth - 1)
    const maxY = Math.max(0, window.innerHeight - 1)
    const cx = clampCoord(px, maxX)
    const cy = clampCoord(py, maxY)

    const root = document.createElement("div")
    root.id = ROOT_ID
    root.setAttribute("data-bmxt-nav", "1")
    root.style.position = "fixed"
    root.style.left = cx + "px"
    root.style.top = cy + "px"
    root.style.margin = "0"
    root.style.padding = "0"
    root.style.width = "auto"
    root.style.height = "auto"
    root.style.pointerEvents = "none"
    root.style.zIndex = "2147483647"
    root.style.lineHeight = "0"
    root.innerHTML = pointerSvgMarkup()

    const mount = document.body || document.documentElement
    mount.appendChild(root)
    sessionWin().bmxtNav = { x: cx, y: cy, root }
    return { ok: true, x: cx, y: cy }
  }

  function clickAt(cx: number, cy: number): void {
    const top = document.elementFromPoint(cx, cy)
    if (!top) {
      return
    }
    const el = top as HTMLElement
    const closest = el.closest(
      "a,button,[role='button'],input,textarea,select,label,summary,[tabindex]"
    )
    const target = (closest || el) as HTMLElement
    const opts: MouseEventInit = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: cx,
      clientY: cy,
      button: 0
    }
    target.dispatchEvent(new MouseEvent("pointerdown", opts))
    target.dispatchEvent(new MouseEvent("mousedown", opts))
    target.dispatchEvent(new MouseEvent("pointerup", opts))
    target.dispatchEvent(new MouseEvent("mouseup", opts))
    target.dispatchEvent(new MouseEvent("click", opts))
    if (typeof target.click === "function") {
      target.click()
    }
  }

  try {
    if (action === "stop") {
      removeSession()
      return { ok: true, x: 0, y: 0 }
    }

    if (action === "start") {
      if (useCenter === 1 || x < 0 || y < 0) {
        const c = viewportCenter()
        return installAt(c.x, c.y)
      }
      return installAt(x, y)
    }

    let sess = sessionWin().bmxtNav
    if (!sess) {
      const c = viewportCenter()
      return installAt(c.x, c.y)
    }

    if (action === "move") {
      const maxX = Math.max(0, window.innerWidth - 1)
      const maxY = Math.max(0, window.innerHeight - 1)
      sess.x = clampCoord(sess.x + dx, maxX)
      sess.y = clampCoord(sess.y + dy, maxY)
      sess.root.style.left = sess.x + "px"
      sess.root.style.top = sess.y + "px"
      return { ok: true, x: sess.x, y: sess.y }
    }

    if (action === "click") {
      clickAt(sess.x, sess.y)
      return { ok: true, x: sess.x, y: sess.y }
    }

    return { ok: false, reason: "unknown-action" }
  } catch (e) {
    const msg = e && typeof e === "object" && "message" in e ? String((e as Error).message) : "inject-error"
    return { ok: false, reason: msg }
  }
}
