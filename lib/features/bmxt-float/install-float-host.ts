/**
 * EN: Fixed-position iframe host for bmxt-float.html (keeps iframe across hide).
 *     Auto-moves to a free corner when overlapping nav (or similar) page UI, with animation.
 * JA: bmxt-float.html 用の固定レイヤ。nav 等と重なると四隅へアニメ付き退避。非表示でも iframe 保持。
 */

import type {
  BmxtFloatHostAction,
  BmxtFloatHostResponse
} from "./float-host-message"
import { BMXT_FLOAT_VISIBILITY_MESSAGE_TYPE } from "./float-host-message"
import {
  FLOAT_DEFAULT_CORNER,
  FLOAT_OBSTACLE_PAD_PX,
  FLOAT_VIEWPORT_MARGIN_PX,
  cornerToRect,
  inflateRect,
  pickFloatCorner,
  type FloatCorner,
  type FloatRect
} from "./float-host-placement"

const HOST_ROOT_ID = "bmxt-float-host-root"
const FLOAT_PAGE = "bmxt-float.html"
const MOVE_MS = 420
const MOVE_EASING = "cubic-bezier(0.22, 1, 0.36, 1)"
const POSITION_TRANSITION =
  `left ${MOVE_MS}ms ${MOVE_EASING}, top ${MOVE_MS}ms ${MOVE_EASING}, ` +
  `box-shadow ${MOVE_MS}ms ease`
const OBSTACLE_SELECTOR = [
  "[data-bmxt-nav]",
  "[data-bmxt-nav-menu]",
  "[data-bmxt-nav-hint]",
  "[data-bmxt-nav-target-hud]",
  "[data-bmxt-nav-textsel-hint]"
].join(",")

type FloatHostState = {
  root: HTMLDivElement
  iframe: HTMLIFrameElement
  visible: boolean
  tabId: number | null
  corner: FloatCorner
  /** EN: Ignore avoid passes until this time (ms since epoch) while a move animates. */
  suppressAvoidUntilMs: number
  avoidRaf: number | null
  pendingAnimate: boolean
  movingTimer: ReturnType<typeof setTimeout> | null
  observer: MutationObserver | null
  onResize: (() => void) | null
  onTransitionEnd: ((event: TransitionEvent) => void) | null
}

let hostState: FloatHostState | null = null

function readCssPxSize(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }
  return parsed
}

function measureFloatSize(root: HTMLDivElement): { width: number; height: number } {
  const rect = root.getBoundingClientRect()
  if (rect.width > 0 && rect.height > 0) {
    return { width: rect.width, height: rect.height }
  }
  const style = window.getComputedStyle(root)
  return {
    width: readCssPxSize(style.width, Math.min(520, window.innerWidth - FLOAT_VIEWPORT_MARGIN_PX * 2)),
    height: readCssPxSize(style.height, Math.min(360, window.innerHeight - FLOAT_VIEWPORT_MARGIN_PX * 2))
  }
}

function collectObstacleRects(): FloatRect[] {
  const nodes = document.querySelectorAll(OBSTACLE_SELECTOR)
  const out: FloatRect[] = []
  for (const node of nodes) {
    if (!(node instanceof HTMLElement)) {
      continue
    }
    if (node.id === HOST_ROOT_ID || node.closest(`#${HOST_ROOT_ID}`)) {
      continue
    }
    const rect = node.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) {
      continue
    }
    out.push(
      inflateRect(
        {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height
        },
        FLOAT_OBSTACLE_PAD_PX
      )
    )
  }
  return out
}

function isInsideFloatHost(node: Node, root: HTMLElement): boolean {
  if (node === root) {
    return true
  }
  if (root.contains(node)) {
    return true
  }
  return false
}

function mutationRelevantToAvoidance(records: MutationRecord[], root: HTMLElement): boolean {
  for (const record of records) {
    if (isInsideFloatHost(record.target, root)) {
      continue
    }
    if (record.type === "attributes") {
      return true
    }
    for (const added of record.addedNodes) {
      if (!isInsideFloatHost(added, root)) {
        return true
      }
    }
    for (const removed of record.removedNodes) {
      if (!isInsideFloatHost(removed, root)) {
        return true
      }
    }
  }
  return false
}

function targetLeftTop(
  root: HTMLDivElement,
  corner: FloatCorner
): { left: string; top: string } {
  const size = measureFloatSize(root)
  const rect = cornerToRect(
    corner,
    window.innerWidth,
    window.innerHeight,
    size.width,
    size.height,
    FLOAT_VIEWPORT_MARGIN_PX
  )
  return {
    left: `${Math.round(rect.left)}px`,
    top: `${Math.round(rect.top)}px`
  }
}

function applyPositionInstant(root: HTMLDivElement, left: string, top: string): void {
  root.style.transition = "none"
  root.style.left = left
  root.style.top = top
  root.style.right = "auto"
  root.style.bottom = "auto"
  // Commit instant geometry before re-enabling transition for later moves.
  void root.offsetWidth
  root.style.transition = POSITION_TRANSITION
}

function applyPositionAnimated(root: HTMLDivElement, left: string, top: string): void {
  // Transition must be active on the *current* left/top before the target changes.
  root.style.transition = POSITION_TRANSITION
  void root.offsetWidth
  root.setAttribute("data-bmxt-float-moving", "")
  root.style.boxShadow = "0 12px 40px rgba(88, 166, 255, 0.55), 0 0 0 2px rgba(88, 166, 255, 0.85)"
  root.style.left = left
  root.style.top = top
  root.style.right = "auto"
  root.style.bottom = "auto"
}

function clearMovingChrome(state: FloatHostState): void {
  if (state.movingTimer !== null) {
    clearTimeout(state.movingTimer)
    state.movingTimer = null
  }
  state.suppressAvoidUntilMs = 0
  state.root.removeAttribute("data-bmxt-float-moving")
  state.root.style.boxShadow = "0 8px 32px rgba(0, 0, 0, 0.45)"
  state.root.style.transition = POSITION_TRANSITION
}

function setCorner(state: FloatHostState, corner: FloatCorner, animate: boolean): void {
  const { left, top } = targetLeftTop(state.root, corner)
  const samePos = state.root.style.left === left && state.root.style.top === top
  const sameCorner = state.corner === corner
  if (sameCorner && samePos) {
    return
  }

  const shouldAnimate = animate && !sameCorner
  state.corner = corner
  state.root.setAttribute("data-bmxt-float-corner", corner)

  if (shouldAnimate) {
    applyPositionAnimated(state.root, left, top)
    state.suppressAvoidUntilMs = Date.now() + MOVE_MS
    if (state.movingTimer !== null) {
      clearTimeout(state.movingTimer)
    }
    state.movingTimer = setTimeout(() => {
      clearMovingChrome(state)
      // Re-check obstacles after the move settles (nav may have moved again).
      scheduleAvoidPass(true)
    }, MOVE_MS + 48)
    return
  }

  // Instant path (initial show / hide reset). Do not interrupt an in-flight move
  // unless the caller explicitly wants a new corner without animation.
  if (state.root.hasAttribute("data-bmxt-float-moving") && sameCorner) {
    return
  }
  applyPositionInstant(state.root, left, top)
  clearMovingChrome(state)
}

function reconcileFloatPlacement(animate: boolean): void {
  if (hostState === null || !hostState.visible) {
    return
  }
  const state = hostState
  if (animate && Date.now() < state.suppressAvoidUntilMs) {
    return
  }
  const size = measureFloatSize(state.root)
  const next = pickFloatCorner({
    current: state.corner,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    floatWidth: size.width,
    floatHeight: size.height,
    obstacles: collectObstacleRects()
  })
  setCorner(state, next, animate)
}

function scheduleAvoidPass(animate: boolean): void {
  if (hostState === null) {
    return
  }
  if (animate) {
    hostState.pendingAnimate = true
  }
  if (hostState.avoidRaf !== null) {
    return
  }
  hostState.avoidRaf = requestAnimationFrame(() => {
    if (hostState === null) {
      return
    }
    const useAnimate = hostState.pendingAnimate
    hostState.pendingAnimate = false
    hostState.avoidRaf = null
    reconcileFloatPlacement(useAnimate)
  })
}

function startAvoidWatch(state: FloatHostState): void {
  stopAvoidWatch(state)

  const observer = new MutationObserver((records) => {
    if (!mutationRelevantToAvoidance(records, state.root)) {
      return
    }
    scheduleAvoidPass(true)
  })
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["style", "class", "data-bmxt-nav", "data-bmxt-nav-menu"]
  })
  state.observer = observer

  const onResize = (): void => {
    scheduleAvoidPass(true)
  }
  window.addEventListener("resize", onResize)
  state.onResize = onResize

  const onTransitionEnd = (event: TransitionEvent): void => {
    if (event.target !== state.root) {
      return
    }
    if (event.propertyName !== "left" && event.propertyName !== "top") {
      return
    }
    clearMovingChrome(state)
  }
  state.root.addEventListener("transitionend", onTransitionEnd)
  state.onTransitionEnd = onTransitionEnd
}

function stopAvoidWatch(state: FloatHostState): void {
  if (state.avoidRaf !== null) {
    cancelAnimationFrame(state.avoidRaf)
    state.avoidRaf = null
  }
  state.pendingAnimate = false
  if (state.observer !== null) {
    state.observer.disconnect()
    state.observer = null
  }
  if (state.onResize !== null) {
    window.removeEventListener("resize", state.onResize)
    state.onResize = null
  }
  if (state.onTransitionEnd !== null) {
    state.root.removeEventListener("transitionend", state.onTransitionEnd)
    state.onTransitionEnd = null
  }
}

function applyHostChrome(root: HTMLDivElement, iframe: HTMLIFrameElement, closeBtn: HTMLButtonElement): void {
  root.style.position = "fixed"
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
  root.style.willChange = "left, top"
  root.style.transition = POSITION_TRANSITION

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

function floatPageUrl(tabId: number | null): string {
  const base = chrome.runtime.getURL(FLOAT_PAGE)
  if (tabId === null || !Number.isInteger(tabId) || tabId < 0) {
    return base
  }
  return `${base}?tabId=${tabId}`
}

function reportFloatVisibilityToSw(
  tabId: number | null,
  visible: boolean,
  clearSessions = false
): void {
  if (tabId === null || !Number.isInteger(tabId) || tabId < 0) {
    return
  }
  try {
    void chrome.runtime.sendMessage({
      type: BMXT_FLOAT_VISIBILITY_MESSAGE_TYPE,
      tabId,
      visible,
      clearSessions
    })
  } catch {
    /* SW unavailable */
  }
}

function ensureHost(tabId: number | null = null): FloatHostState {
  if (hostState !== null) {
    if (tabId !== null && hostState.tabId !== tabId) {
      hostState.tabId = tabId
      const nextSrc = floatPageUrl(tabId)
      if (hostState.iframe.src !== nextSrc) {
        hostState.iframe.src = nextSrc
      }
    }
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
  iframe.src = floatPageUrl(tabId)

  const state: FloatHostState = {
    root,
    iframe,
    visible: false,
    tabId,
    corner: FLOAT_DEFAULT_CORNER,
    suppressAvoidUntilMs: 0,
    avoidRaf: null,
    pendingAnimate: false,
    movingTimer: null,
    observer: null,
    onResize: null,
    onTransitionEnd: null
  }

  closeBtn.addEventListener("click", (event) => {
    event.preventDefault()
    event.stopPropagation()
    setFloatHostVisible(false)
    reportFloatVisibilityToSw(state.tabId, false, false)
  })

  iframe.addEventListener("load", () => {
    if (hostState !== state || !state.visible) {
      return
    }
    focusFloatIframe(state)
  })

  root.appendChild(closeBtn)
  root.appendChild(iframe)
  const mountParent = document.documentElement ?? document.body
  mountParent.appendChild(root)

  const { left, top } = targetLeftTop(root, FLOAT_DEFAULT_CORNER)
  applyPositionInstant(root, left, top)
  root.setAttribute("data-bmxt-float-corner", FLOAT_DEFAULT_CORNER)
  hostState = state
  return state
}

function focusFloatIframe(state: FloatHostState): void {
  try {
    state.iframe.focus({ preventScroll: true })
  } catch {
    try {
      state.iframe.focus()
    } catch {
      /* focus unavailable */
    }
  }
  try {
    state.iframe.contentWindow?.focus()
  } catch {
    /* cross-origin or unloaded */
  }
}

function setFloatHostVisible(visible: boolean): boolean {
  const state = ensureHost()
  state.visible = visible
  state.root.style.display = visible ? "flex" : "none"
  if (visible) {
    startAvoidWatch(state)
    // First paint: place instantly, then allow animated moves for later obstacle changes.
    scheduleAvoidPass(false)
    // EN: Return keyboard focus to float so nav stays operable after page navigation.
    queueMicrotask(() => {
      focusFloatIframe(state)
    })
    window.setTimeout(() => {
      if (hostState === state && state.visible) {
        focusFloatIframe(state)
      }
    }, 120)
  } else {
    stopAvoidWatch(state)
    clearMovingChrome(state)
    setCorner(state, FLOAT_DEFAULT_CORNER, false)
  }
  return state.visible
}

export function applyFloatHostAction(
  action: BmxtFloatHostAction = "toggle",
  tabId: number | null = null
): BmxtFloatHostResponse {
  const state = ensureHost(tabId)
  if (action === "show") {
    return { ok: true, visible: setFloatHostVisible(true) }
  }
  if (action === "hide") {
    return { ok: true, visible: setFloatHostVisible(false) }
  }
  return { ok: true, visible: setFloatHostVisible(!state.visible) }
}
