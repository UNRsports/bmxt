/**
 * EN: Fixed-position iframe host for bmxt-float.html (keeps iframe across hide).
 *     Free-form rect (persisted). When overlapping nav UI, hangs mostly off-viewport
 *     (peek strip); restores the pre-escape home rect when nav clears (Alt OFF).
 * JA: bmxt-float.html 用の固定レイヤ。自由矩形を記憶。nav と重なるとビューポート外へ
 *     はみ出して退避し、nav OFF で退避前位置へ戻る。
 */

import type {
  BmxtFloatGeometryResponse,
  BmxtFloatHostAction,
  BmxtFloatHostResponse
} from "./float-host-message"
import { BMXT_FLOAT_VISIBILITY_MESSAGE_TYPE } from "./float-host-message"
import {
  FLOAT_DEFAULT_CORNER,
  FLOAT_OBSTACLE_PAD_PX,
  FLOAT_VIEWPORT_MARGIN_PX,
  computeOverhangRect,
  cornerToRect,
  floatOverlapsAnyObstacle,
  inflateRect,
  type FloatCorner,
  type FloatRect
} from "./float-host-placement"
import {
  clampFloatGeometry,
  defaultFloatGeometry,
  nudgeFloatGeometry,
  type FloatGeometryArrow,
  type FloatGeometryNudgeMode
} from "./float-geometry"
import {
  loadFloatGeometryAsync,
  persistFloatGeometryNow,
  schedulePersistFloatGeometry
} from "./float-geometry-storage"

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
  rect: FloatRect
  corner: FloatCorner
  geometryReady: boolean
  /**
   * EN: User home rect before nav overhang escape (restored when obstacles clear).
   * JA: nav はみ出し退避前のユーザー位置（障害消失で復帰）。
   */
  homeRectBeforeAvoid: FloatRect | null
  /** EN: True while hanging off-viewport for nav avoidance. */
  escapedForNav: boolean
  /** EN: Ignore avoid passes until this time (ms since epoch) while a move animates. */
  suppressAvoidUntilMs: number
  avoidRaf: number | null
  pendingAnimate: boolean
  movingTimer: ReturnType<typeof setTimeout> | null
  observer: MutationObserver | null
  onResize: (() => void) | null
  onTransitionEnd: ((event: TransitionEvent) => void) | null
  /** EN: Last keydown was Tab — used to reclaim focus if Tab escapes the iframe. */
  lastKeyWasTab: boolean
  onDocKeyDown: ((event: KeyboardEvent) => void) | null
  onDocFocusIn: ((event: FocusEvent) => void) | null
}

let hostState: FloatHostState | null = null

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

function applyRectToRoot(root: HTMLDivElement, rect: FloatRect): void {
  root.style.width = `${Math.round(rect.width)}px`
  root.style.height = `${Math.round(rect.height)}px`
  root.style.left = `${Math.round(rect.left)}px`
  root.style.top = `${Math.round(rect.top)}px`
  root.style.right = "auto"
  root.style.bottom = "auto"
}

function applyPositionInstant(root: HTMLDivElement, rect: FloatRect): void {
  root.style.transition = "none"
  applyRectToRoot(root, rect)
  void root.offsetWidth
  root.style.transition = POSITION_TRANSITION
}

function applyPositionAnimated(root: HTMLDivElement, left: number, top: number): void {
  root.style.transition = POSITION_TRANSITION
  void root.offsetWidth
  root.setAttribute("data-bmxt-float-moving", "")
  root.style.boxShadow = "0 12px 40px rgba(88, 166, 255, 0.55), 0 0 0 2px rgba(88, 166, 255, 0.85)"
  root.style.left = `${Math.round(left)}px`
  root.style.top = `${Math.round(top)}px`
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

function commitRect(
  state: FloatHostState,
  rect: FloatRect,
  options: {
    animate: boolean
    persist: boolean
    immediatePersist?: boolean
    /** EN: Allow left/top outside the viewport (nav overhang). */
    allowOutside?: boolean
  }
): void {
  const next =
    options.allowOutside === true
      ? {
          left: Math.round(rect.left),
          top: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        }
      : clampFloatGeometry(rect, window.innerWidth, window.innerHeight)
  const samePos =
    state.rect.left === next.left &&
    state.rect.top === next.top &&
    state.rect.width === next.width &&
    state.rect.height === next.height
  if (samePos && !options.animate) {
    return
  }

  const posOnlyChanged =
    state.rect.left !== next.left ||
    state.rect.top !== next.top
  const sizeChanged =
    state.rect.width !== next.width ||
    state.rect.height !== next.height

  state.rect = next
  state.root.style.width = `${Math.round(next.width)}px`
  state.root.style.height = `${Math.round(next.height)}px`

  if (options.animate && posOnlyChanged && !sizeChanged) {
    applyPositionAnimated(state.root, next.left, next.top)
    state.suppressAvoidUntilMs = Date.now() + MOVE_MS
    if (state.movingTimer !== null) {
      clearTimeout(state.movingTimer)
    }
    state.movingTimer = setTimeout(() => {
      clearMovingChrome(state)
      scheduleAvoidPass(true)
    }, MOVE_MS + 48)
  } else {
    if (state.root.hasAttribute("data-bmxt-float-moving") && samePos) {
      return
    }
    applyPositionInstant(state.root, next)
    clearMovingChrome(state)
  }

  if (options.persist) {
    if (options.immediatePersist === true) {
      persistFloatGeometryNow(next)
    } else {
      schedulePersistFloatGeometry(next)
    }
  }
}

function reconcileFloatPlacement(animate: boolean): void {
  if (hostState === null || !hostState.visible || !hostState.geometryReady) {
    return
  }
  const state = hostState
  if (animate && Date.now() < state.suppressAvoidUntilMs) {
    return
  }
  const obstacles = collectObstacleRects()
  if (obstacles.length === 0) {
    if (state.escapedForNav && state.homeRectBeforeAvoid !== null) {
      const home = state.homeRectBeforeAvoid
      state.escapedForNav = false
      state.homeRectBeforeAvoid = null
      state.root.removeAttribute("data-bmxt-float-nav-escaped")
      commitRect(state, home, {
        animate,
        persist: true,
        immediatePersist: true
      })
      return
    }
    const clamped = clampFloatGeometry(state.rect, window.innerWidth, window.innerHeight)
    if (
      clamped.left !== state.rect.left ||
      clamped.top !== state.rect.top ||
      clamped.width !== state.rect.width ||
      clamped.height !== state.rect.height
    ) {
      commitRect(state, clamped, { animate: false, persist: true, immediatePersist: true })
    }
    return
  }

  const reference = state.homeRectBeforeAvoid ?? state.rect
  if (!state.escapedForNav && !floatOverlapsAnyObstacle(state.rect, obstacles)) {
    return
  }

  if (!state.escapedForNav) {
    state.homeRectBeforeAvoid = { ...state.rect }
    state.escapedForNav = true
    state.root.setAttribute("data-bmxt-float-nav-escaped", "")
  }

  const overhang = computeOverhangRect({
    home: reference,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    obstacles
  })
  commitRect(state, overhang, {
    animate,
    persist: false,
    allowOutside: true
  })
}

function nearestCornerForRect(rect: FloatRect): FloatCorner {
  const corners: FloatCorner[] = [
    "bottom-right",
    "bottom-left",
    "top-right",
    "top-left"
  ]
  let best: FloatCorner = FLOAT_DEFAULT_CORNER
  let bestDist = Number.POSITIVE_INFINITY
  for (const corner of corners) {
    const c = cornerToRect(
      corner,
      window.innerWidth,
      window.innerHeight,
      rect.width,
      rect.height,
      FLOAT_VIEWPORT_MARGIN_PX
    )
    const dx = c.left - rect.left
    const dy = c.top - rect.top
    const dist = dx * dx + dy * dy
    if (dist < bestDist) {
      bestDist = dist
      best = corner
    }
  }
  return best
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
    if (hostState === null) {
      return
    }
    if (hostState.escapedForNav && hostState.homeRectBeforeAvoid !== null) {
      const overhang = computeOverhangRect({
        home: hostState.homeRectBeforeAvoid,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        obstacles: collectObstacleRects()
      })
      commitRect(hostState, overhang, {
        animate: false,
        persist: false,
        allowOutside: true
      })
      return
    }
    const clamped = clampFloatGeometry(
      hostState.rect,
      window.innerWidth,
      window.innerHeight
    )
    commitRect(hostState, clamped, { animate: false, persist: true, immediatePersist: true })
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
  root.style.zIndex = "2147483646"
  root.style.display = "none"
  root.style.flexDirection = "column"
  root.style.boxSizing = "border-box"
  root.style.border = "1px solid rgba(48, 54, 61, 0.95)"
  root.style.borderRadius = "8px"
  root.style.overflow = "hidden"
  root.style.boxShadow = "0 8px 32px rgba(0, 0, 0, 0.45)"
  root.style.background = "#0d1117"
  root.style.willChange = "left, top, width, height"
  root.style.transition = POSITION_TRANSITION

  closeBtn.type = "button"
  closeBtn.textContent = "×"
  closeBtn.setAttribute("aria-label", "Hide BMXt float")
  closeBtn.tabIndex = -1
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

async function hydrateGeometry(state: FloatHostState): Promise<void> {
  const loaded = await loadFloatGeometryAsync(window.innerWidth, window.innerHeight)
  state.rect = loaded
  state.corner = nearestCornerForRect(loaded)
  state.root.setAttribute("data-bmxt-float-corner", state.corner)
  applyPositionInstant(state.root, loaded)
  state.geometryReady = true
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

  const initial = defaultFloatGeometry(window.innerWidth, window.innerHeight)
  applyPositionInstant(root, initial)

  const state: FloatHostState = {
    root,
    iframe,
    visible: false,
    tabId,
    rect: initial,
    corner: FLOAT_DEFAULT_CORNER,
    geometryReady: false,
    homeRectBeforeAvoid: null,
    escapedForNav: false,
    suppressAvoidUntilMs: 0,
    avoidRaf: null,
    pendingAnimate: false,
    movingTimer: null,
    observer: null,
    onResize: null,
    onTransitionEnd: null,
    lastKeyWasTab: false,
    onDocKeyDown: null,
    onDocFocusIn: null
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

  state.onDocKeyDown = (event: KeyboardEvent) => {
    state.lastKeyWasTab = event.key === "Tab"
  }
  state.onDocFocusIn = (event: FocusEvent) => {
    if (!state.visible || !state.lastKeyWasTab) {
      return
    }
    const target = event.target
    if (!(target instanceof Node)) {
      return
    }
    if (state.root.contains(target)) {
      return
    }
    state.lastKeyWasTab = false
    focusFloatIframe(state)
  }
  document.addEventListener("keydown", state.onDocKeyDown, true)
  document.addEventListener("focusin", state.onDocFocusIn, true)

  root.appendChild(closeBtn)
  root.appendChild(iframe)
  const mountParent = document.documentElement ?? document.body
  mountParent.appendChild(root)

  root.setAttribute("data-bmxt-float-corner", FLOAT_DEFAULT_CORNER)
  hostState = state
  void hydrateGeometry(state)
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
    const applyVisible = (): void => {
      if (hostState !== state || !state.visible) {
        return
      }
      startAvoidWatch(state)
      scheduleAvoidPass(false)
      queueMicrotask(() => {
        focusFloatIframe(state)
      })
      window.setTimeout(() => {
        if (hostState === state && state.visible) {
          focusFloatIframe(state)
        }
      }, 120)
    }
    if (state.geometryReady) {
      applyVisible()
    } else {
      void hydrateGeometry(state).then(applyVisible)
    }
  } else {
    stopAvoidWatch(state)
    clearMovingChrome(state)
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

export function applyFloatGeometryNudge(
  mode: FloatGeometryNudgeMode,
  arrow: FloatGeometryArrow
): BmxtFloatGeometryResponse {
  const state = ensureHost()
  if (!state.visible) {
    return { ok: false, reason: "float_hidden" }
  }

  if (state.escapedForNav && state.homeRectBeforeAvoid !== null) {
    const nudgedHome = nudgeFloatGeometry(
      state.homeRectBeforeAvoid,
      mode,
      arrow,
      window.innerWidth,
      window.innerHeight
    )
    state.homeRectBeforeAvoid = nudgedHome
    persistFloatGeometryNow(nudgedHome)
    const overhang = computeOverhangRect({
      home: nudgedHome,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      obstacles: collectObstacleRects()
    })
    state.corner = nearestCornerForRect(nudgedHome)
    state.root.setAttribute("data-bmxt-float-corner", state.corner)
    commitRect(state, overhang, {
      animate: false,
      persist: false,
      allowOutside: true
    })
    return { ok: true }
  }

  const next = nudgeFloatGeometry(
    state.rect,
    mode,
    arrow,
    window.innerWidth,
    window.innerHeight
  )
  state.corner = nearestCornerForRect(next)
  state.root.setAttribute("data-bmxt-float-corner", state.corner)
  commitRect(state, next, { animate: false, persist: true })
  return { ok: true }
}
