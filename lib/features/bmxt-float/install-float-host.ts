/**
 * EN: Fixed-position iframe host for bmxt-float.html (keeps iframe across hide).
 * JA: bmxt-float.html 用の固定レイヤ。非表示でも iframe を破棄せずセッションを保持。
 */

import type { BmxtFloatHostAction, BmxtFloatHostResponse } from "./float-host-message"

const HOST_ROOT_ID = "bmxt-float-host-root"
const FLOAT_PAGE = "bmxt-float.html"

type FloatHostState = {
  root: HTMLDivElement
  iframe: HTMLIFrameElement
  visible: boolean
}

let hostState: FloatHostState | null = null

function applyHostChrome(root: HTMLDivElement, iframe: HTMLIFrameElement, closeBtn: HTMLButtonElement): void {
  root.style.position = "fixed"
  root.style.right = "16px"
  root.style.bottom = "16px"
  root.style.width = "min(520px, calc(100vw - 32px))"
  root.style.height = "min(360px, calc(100vh - 32px))"
  root.style.zIndex = "2147483646"
  root.style.display = "none"
  root.style.flexDirection = "column"
  root.style.boxSizing = "border-box"
  root.style.border = "1px solid rgba(48, 54, 61, 0.95)"
  root.style.borderRadius = "8px"
  root.style.overflow = "hidden"
  root.style.boxShadow = "0 8px 32px rgba(0, 0, 0, 0.45)"
  root.style.background = "#0d1117"

  closeBtn.type = "button"
  closeBtn.textContent = "×"
  closeBtn.setAttribute("aria-label", "Hide BMXt float")
  closeBtn.style.position = "absolute"
  closeBtn.style.top = "4px"
  closeBtn.style.right = "6px"
  closeBtn.style.zIndex = "2"
  closeBtn.style.width = "24px"
  closeBtn.style.height = "24px"
  closeBtn.style.padding = "0"
  closeBtn.style.border = "none"
  closeBtn.style.borderRadius = "4px"
  closeBtn.style.background = "rgba(22, 27, 34, 0.92)"
  closeBtn.style.color = "#c9d1d9"
  closeBtn.style.fontSize = "16px"
  closeBtn.style.lineHeight = "24px"
  closeBtn.style.cursor = "pointer"

  iframe.title = "BMXt float"
  iframe.style.flex = "1"
  iframe.style.width = "100%"
  iframe.style.height = "100%"
  iframe.style.border = "none"
  iframe.style.background = "#0d1117"
  iframe.allow = ""
}

function ensureHost(): FloatHostState {
  if (hostState !== null) {
    return hostState
  }

  const existing = document.getElementById(HOST_ROOT_ID)
  if (existing instanceof HTMLDivElement) {
    existing.remove()
  }

  const root = document.createElement("div")
  root.id = HOST_ROOT_ID
  root.setAttribute("data-bmxt-float-host", "")

  const closeBtn = document.createElement("button")
  const iframe = document.createElement("iframe")
  applyHostChrome(root, iframe, closeBtn)
  iframe.src = chrome.runtime.getURL(FLOAT_PAGE)

  closeBtn.addEventListener("click", (event) => {
    event.preventDefault()
    event.stopPropagation()
    setFloatHostVisible(false)
  })

  root.appendChild(closeBtn)
  root.appendChild(iframe)
  const mountParent = document.documentElement ?? document.body
  mountParent.appendChild(root)

  hostState = { root, iframe, visible: false }
  return hostState
}

function setFloatHostVisible(visible: boolean): boolean {
  const state = ensureHost()
  state.visible = visible
  state.root.style.display = visible ? "flex" : "none"
  return state.visible
}

export function applyFloatHostAction(action: BmxtFloatHostAction = "toggle"): BmxtFloatHostResponse {
  const state = ensureHost()
  if (action === "show") {
    return { ok: true, visible: setFloatHostVisible(true) }
  }
  if (action === "hide") {
    return { ok: true, visible: setFloatHostVisible(false) }
  }
  return { ok: true, visible: setFloatHostVisible(!state.visible) }
}
