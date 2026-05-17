/**
 * EN: Injected function for `chrome.scripting.executeScript` — must live in the SW bundle
 *     with the caller (`run-nav-inject.ts`). No imports/exports on the function itself.
 * JA: `executeScript` 用。import/export 不可の単体関数。
 */

export type NavInjectAction =
  | "start"
  | "stop"
  | "move"
  | "click"
  | "forwardKey"
  | "insertText"
  | "deleteBackward"
  | "deleteForward"
  | "clearTyping"

export type NavInjectResult =
  | { ok: true; x: number; y: number; editableFocused?: boolean }
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
  key?: string
  code?: string
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  metaKey?: boolean
  text?: string
}

export function bmxtNavControlInjected(
  action: string,
  useCenter: number,
  x: number,
  y: number,
  dx: number,
  dy: number,
  key = "",
  code = "",
  ctrlKey = 0,
  shiftKey = 0,
  altKey = 0,
  metaKey = 0,
  text = ""
): NavInjectResult {
  const ROOT_ID = "__bmxt_nav_cursor_root__"
  const NAV_CURSOR_SCALE = 1.1
  const TEXT_INPUT_TYPES = new Set([
    "text",
    "search",
    "email",
    "password",
    "url",
    "tel",
    "number"
  ])

  type NavSession = {
    x: number
    y: number
    root: HTMLDivElement
    typingEl: HTMLElement | null
  }

  function sessionWin(): { bmxtNav?: NavSession } {
    return window as unknown as { bmxtNav?: NavSession }
  }

  function isEditable(el: Element | null): el is HTMLElement {
    if (!el || !(el instanceof HTMLElement)) {
      return false
    }
    if (el instanceof HTMLTextAreaElement) {
      return !el.disabled && !el.readOnly
    }
    if (el instanceof HTMLInputElement) {
      if (el.disabled || el.readOnly) {
        return false
      }
      const t = (el.type || "text").toLowerCase()
      return TEXT_INPUT_TYPES.has(t)
    }
    if (el.isContentEditable) {
      return true
    }
    return false
  }

  function resolveEditable(from: Element | null): HTMLElement | null {
    if (!from) {
      return null
    }
    const self = from instanceof HTMLElement ? from : null
    if (self && isEditable(self)) {
      return self
    }
    const nested = from.closest(
      "textarea,input,[contenteditable=''],[contenteditable='true'],[contenteditable='plaintext-only']"
    )
    if (nested instanceof HTMLElement && isEditable(nested)) {
      return nested
    }
    if (self) {
      const labelled = self.closest("label")
      if (labelled) {
        const id = labelled.getAttribute("for")
        if (id) {
          const input = document.getElementById(id)
          if (input instanceof HTMLElement && isEditable(input)) {
            return input
          }
        }
      }
    }
    return null
  }

  function typingTarget(sess: NavSession): HTMLElement | null {
    const el = sess.typingEl
    if (el && document.contains(el) && isEditable(el)) {
      return el
    }
    sess.typingEl = null
    return null
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
      if (cur.typingEl) {
        cur.typingEl.blur()
      }
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
    const prevTyping = sessionWin().bmxtNav?.typingEl ?? null
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
    sessionWin().bmxtNav = { x: cx, y: cy, root, typingEl: null }
    if (prevTyping) {
      prevTyping.blur()
    }
    return { ok: true, x: cx, y: cy }
  }

  function focusEditableAt(target: HTMLElement, cx: number, cy: number): void {
    target.focus({ preventScroll: false })
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      const len = target.value.length
      try {
        target.setSelectionRange(len, len)
      } catch {
        /* type may not support selection */
      }
      return
    }
    if (target.isContentEditable) {
      const sel = window.getSelection()
      const range =
        typeof document.caretRangeFromPoint === "function"
          ? document.caretRangeFromPoint(cx, cy)
          : null
      if (sel && range) {
        sel.removeAllRanges()
        sel.addRange(range)
      }
    }
  }

  function clickAt(cx: number, cy: number): { editableFocused: boolean } {
    const top = document.elementFromPoint(cx, cy)
    if (!top) {
      return { editableFocused: false }
    }
    const editable = resolveEditable(top)
    const el = top as HTMLElement
    const closest = el.closest(
      "a,button,[role='button'],input,textarea,select,label,summary,[tabindex]"
    )
    const target = (editable || closest || el) as HTMLElement
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
    const focusTarget = editable ?? resolveEditable(document.activeElement)
    if (focusTarget) {
      focusEditableAt(focusTarget, cx, cy)
      const sess = sessionWin().bmxtNav
      if (sess) {
        sess.typingEl = focusTarget
      }
      return { editableFocused: true }
    }
    const sess = sessionWin().bmxtNav
    if (sess) {
      sess.typingEl = null
    }
    return { editableFocused: false }
  }

  function dispatchInputEvent(target: HTMLElement, inputType: string, data: string | null): void {
    target.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        cancelable: true,
        inputType,
        data
      })
    )
  }

  function insertTextInTarget(target: HTMLElement, chunk: string): boolean {
    if (!chunk) {
      return false
    }
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      const start = target.selectionStart ?? target.value.length
      const end = target.selectionEnd ?? start
      const before = target.value.slice(0, start)
      const after = target.value.slice(end)
      target.value = before + chunk + after
      const caret = start + chunk.length
      try {
        target.setSelectionRange(caret, caret)
      } catch {
        /* ignore */
      }
      dispatchInputEvent(target, "insertText", chunk)
      target.dispatchEvent(new Event("change", { bubbles: true }))
      return true
    }
    if (target.isContentEditable) {
      target.focus()
      if (document.execCommand("insertText", false, chunk)) {
        dispatchInputEvent(target, "insertText", chunk)
        return true
      }
      return false
    }
    return false
  }

  function deleteBackwardInTarget(target: HTMLElement): boolean {
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      const start = target.selectionStart ?? 0
      const end = target.selectionEnd ?? 0
      const v = target.value
      if (start !== end) {
        target.value = v.slice(0, start) + v.slice(end)
        try {
          target.setSelectionRange(start, start)
        } catch {
          /* ignore */
        }
      } else if (start > 0) {
        target.value = v.slice(0, start - 1) + v.slice(start)
        try {
          target.setSelectionRange(start - 1, start - 1)
        } catch {
          /* ignore */
        }
      } else {
        return false
      }
      dispatchInputEvent(target, "deleteContentBackward", null)
      target.dispatchEvent(new Event("change", { bubbles: true }))
      return true
    }
    if (target.isContentEditable) {
      target.focus()
      return document.execCommand("delete", false)
    }
    return false
  }

  function deleteForwardInTarget(target: HTMLElement): boolean {
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      const start = target.selectionStart ?? 0
      const end = target.selectionEnd ?? 0
      const v = target.value
      if (start !== end) {
        target.value = v.slice(0, start) + v.slice(end)
        try {
          target.setSelectionRange(start, start)
        } catch {
          /* ignore */
        }
      } else if (start < v.length) {
        target.value = v.slice(0, start) + v.slice(start + 1)
        try {
          target.setSelectionRange(start, start)
        } catch {
          /* ignore */
        }
      } else {
        return false
      }
      dispatchInputEvent(target, "deleteContentForward", null)
      target.dispatchEvent(new Event("change", { bubbles: true }))
      return true
    }
    if (target.isContentEditable) {
      target.focus()
      return document.execCommand("forwardDelete", false)
    }
    return false
  }

  function forwardKeyOnTarget(
    target: HTMLElement,
    k: string,
    c: string,
    ctrl: boolean,
    shift: boolean,
    alt: boolean,
    meta: boolean
  ): void {
    const opts: KeyboardEventInit = {
      key: k,
      code: c || k,
      bubbles: true,
      cancelable: true,
      ctrlKey: ctrl,
      shiftKey: shift,
      altKey: alt,
      metaKey: meta
    }
    target.dispatchEvent(new KeyboardEvent("keydown", opts))
    if (k.length === 1 && !ctrl && !meta && !alt) {
      target.dispatchEvent(new KeyboardEvent("keypress", opts))
    }
    target.dispatchEvent(new KeyboardEvent("keyup", opts))
  }

  try {
    if (action === "stop") {
      removeSession()
      return { ok: true, x: 0, y: 0 }
    }

    if (action === "clearTyping") {
      const sess = sessionWin().bmxtNav
      if (sess?.typingEl) {
        sess.typingEl.blur()
        sess.typingEl = null
      }
      return { ok: true, x: sess?.x ?? 0, y: sess?.y ?? 0 }
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
      sess.typingEl = null
      const maxX = Math.max(0, window.innerWidth - 1)
      const maxY = Math.max(0, window.innerHeight - 1)
      sess.x = clampCoord(sess.x + dx, maxX)
      sess.y = clampCoord(sess.y + dy, maxY)
      sess.root.style.left = sess.x + "px"
      sess.root.style.top = sess.y + "px"
      return { ok: true, x: sess.x, y: sess.y }
    }

    if (action === "click") {
      const clickRes = clickAt(sess.x, sess.y)
      return { ok: true, x: sess.x, y: sess.y, editableFocused: clickRes.editableFocused }
    }

    if (action === "insertText") {
      const target = typingTarget(sess)
      if (!target) {
        return { ok: false, reason: "no-typing-target" }
      }
      if (!insertTextInTarget(target, text)) {
        return { ok: false, reason: "insert-failed" }
      }
      return { ok: true, x: sess.x, y: sess.y, editableFocused: true }
    }

    if (action === "deleteBackward") {
      const target = typingTarget(sess)
      if (!target) {
        return { ok: false, reason: "no-typing-target" }
      }
      if (!deleteBackwardInTarget(target)) {
        return { ok: false, reason: "delete-failed" }
      }
      return { ok: true, x: sess.x, y: sess.y, editableFocused: true }
    }

    if (action === "deleteForward") {
      const target = typingTarget(sess)
      if (!target) {
        return { ok: false, reason: "no-typing-target" }
      }
      if (!deleteForwardInTarget(target)) {
        return { ok: false, reason: "delete-failed" }
      }
      return { ok: true, x: sess.x, y: sess.y, editableFocused: true }
    }

    if (action === "forwardKey") {
      const target = typingTarget(sess)
      if (!target) {
        return { ok: false, reason: "no-typing-target" }
      }
      forwardKeyOnTarget(
        target,
        key,
        code,
        ctrlKey === 1,
        shiftKey === 1,
        altKey === 1,
        metaKey === 1
      )
      return { ok: true, x: sess.x, y: sess.y, editableFocused: true }
    }

    return { ok: false, reason: "unknown-action" }
  } catch (e) {
    const msg = e && typeof e === "object" && "message" in e ? String((e as Error).message) : "inject-error"
    return { ok: false, reason: msg }
  }
}
