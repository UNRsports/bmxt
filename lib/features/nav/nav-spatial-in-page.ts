/**
 * EN: Nav spatial snap — collect viewport targets, highlight, link activation (page context).
 * JA: nav 用の矩形スナップ（候補収集・ハイライト・リンク起動）。
 */

import {
  adjacentCandidateIndexByRect,
  findCandidateIndexByPath,
  nearestCandidateIndexByPoint,
  pathsEqual,
  spatialDirFromDelta,
  type SpatialRect,
  type SpatialRectDir
} from "../page-dom/spatial-element-nav.ts"
import { buildPathForElement, resolveNodeFromPath, walkAllElements } from "../page-dom/injected-dom-path.ts"
import {
  isElementLaidOut,
  isElementVisibleInViewport
} from "../page-dom/injected-dom-viewport-visible.ts"
import { activateNavTargetByKind } from "./nav-activate.ts"
import {
  formatNavTargetLabel,
  identifyNavElement,
  resolveNavRealTarget,
  type NavTargetIdentity,
  type NavTargetKind
} from "./nav-target-classify.ts"

export type NavSpatialCandidateMeta = {
  kind: NavTargetKind
  label: string
  matchKeys: string[]
  confidence: number
  key: string
}

export type NavSpatialCandidates = {
  paths: number[][]
  boxes: SpatialRect[]
  metas: NavSpatialCandidateMeta[]
}

const NAV_SPATIAL_MAX_VIEWPORT = 200
const NAV_SPATIAL_MAX_DOCUMENT = 800

/** EN: Viewport = arrow snap; document = `/` jump (includes off-screen). */
export type NavSpatialCollectScope = "viewport" | "document"

let navSpatialHighlightEl: HTMLElement | null = null
let navSpatialHighlightPrev = { outline: "", outlineOffset: "" }

export function clearNavSpatialHighlight(): void {
  if (!navSpatialHighlightEl) {
    return
  }
  navSpatialHighlightEl.style.outline = navSpatialHighlightPrev.outline
  navSpatialHighlightEl.style.outlineOffset = navSpatialHighlightPrev.outlineOffset
  navSpatialHighlightEl = null
}

export function setNavSpatialHighlight(el: Element | null): void {
  clearNavSpatialHighlight()
  if (!(el instanceof HTMLElement)) {
    return
  }
  navSpatialHighlightPrev = {
    outline: el.style.outline,
    outlineOffset: el.style.outlineOffset
  }
  navSpatialHighlightEl = el
  el.style.outline = "2px solid #58a6ff"
  el.style.outlineOffset = "2px"
}

function rectFromElement(el: Element): SpatialRect {
  const r = el.getBoundingClientRect()
  return { x: r.left, y: r.top, w: r.width, h: r.height }
}

function centerOfRect(box: SpatialRect): { x: number; y: number } {
  return { x: Math.round(box.x + box.w / 2), y: Math.round(box.y + box.h / 2) }
}

function isNavSpatialTarget(el: Element, scope: NavSpatialCollectScope): boolean {
  if (!(el instanceof HTMLElement)) {
    return false
  }
  if (scope === "viewport") {
    if (!isElementVisibleInViewport(el)) {
      return false
    }
  } else if (!isElementLaidOut(el)) {
    return false
  }
  const tag = el.tagName.toLowerCase()
  const role = (el.getAttribute("role") ?? "").toLowerCase()
  if (tag === "a") {
    return el.hasAttribute("href")
  }
  if (tag === "area") {
    return el.hasAttribute("href")
  }
  if (tag === "summary") {
    return true
  }
  if (role === "link") {
    return true
  }
  const href = (el.getAttribute("href") ?? "").trim()
  if (href.length > 0 && tag !== "base" && tag !== "link") {
    return true
  }
  if (tag === "button" || role === "button") {
    return !el.hasAttribute("disabled")
  }
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    return !el.disabled && !(el instanceof HTMLInputElement && el.readOnly)
  }
  if (el.isContentEditable) {
    return true
  }
  const tabIndex = el.tabIndex
  return tabIndex >= 0
}

function metaFromElement(el: Element): NavSpatialCandidateMeta {
  const identity = identifyNavElement(el)
  return {
    kind: identity.kind,
    label: formatNavTargetLabel(identity),
    matchKeys: identity.matchKeys,
    confidence: identity.confidence,
    key: identity.key
  }
}

function dedupNavSpatialCandidates(
  raw: Array<{ el: Element; path: number[]; box: SpatialRect }>,
  scope: NavSpatialCollectScope
): NavSpatialCandidates {
  const kept = raw.filter((item, i) => {
    for (let j = 0; j < raw.length; j += 1) {
      if (i === j) {
        continue
      }
      const other = raw[j]!
      if (
        item.el !== other.el &&
        item.el.contains(other.el) &&
        isNavSpatialTarget(other.el, scope)
      ) {
        return false
      }
    }
    return true
  })
  const paths: number[][] = []
  const boxes: SpatialRect[] = []
  const metas: NavSpatialCandidateMeta[] = []
  for (const item of kept) {
    const real = resolveNavRealTarget(item.el)
    const path = buildPathForElement(real) ?? item.path
    paths.push(path)
    boxes.push(rectFromElement(real))
    metas.push(metaFromElement(real))
  }
  return { paths, boxes, metas }
}

export function collectNavSpatialCandidates(
  scope: NavSpatialCollectScope = "viewport"
): NavSpatialCandidates {
  const max =
    scope === "document" ? NAV_SPATIAL_MAX_DOCUMENT : NAV_SPATIAL_MAX_VIEWPORT
  const raw: Array<{ el: Element; path: number[]; box: SpatialRect }> = []
  walkAllElements((el) => {
    if (raw.length >= max) {
      return
    }
    if (!isNavSpatialTarget(el, scope)) {
      return
    }
    const path = buildPathForElement(el)
    if (path == null) {
      return
    }
    raw.push({ el, path, box: rectFromElement(el) })
  })
  return dedupNavSpatialCandidates(raw, scope)
}

export function resolveNavSpatialElement(path: readonly number[] | null): Element | null {
  if (path == null) {
    return null
  }
  return resolveNodeFromPath(path)
}

export function syncNavSpatialSelectionIndex(
  candidates: NavSpatialCandidates,
  selectedPath: number[] | null
): number {
  // EN: No selection (e.g. after free-move) — do not fall back to index 0 (that snaps to the wrong element).
  if (selectedPath == null) {
    return -1
  }
  const byPath = findCandidateIndexByPath(candidates.paths, selectedPath)
  if (byPath >= 0) {
    return byPath
  }
  return candidates.paths.length > 0 ? 0 : -1
}

export function pickInitialNavSpatialIndex(candidates: NavSpatialCandidates, px: number, py: number): number {
  if (candidates.boxes.length === 0) {
    return -1
  }
  return nearestCandidateIndexByPoint(candidates.boxes, px, py)
}

export function navSpatialMoveIndex(
  candidates: NavSpatialCandidates,
  fromIndex: number,
  dx: number,
  dy: number
): number {
  const dir: SpatialRectDir | null = spatialDirFromDelta(dx, dy)
  if (dir === null || fromIndex < 0) {
    return fromIndex
  }
  const next = adjacentCandidateIndexByRect(candidates.boxes, fromIndex, dir)
  return next ?? fromIndex
}

export function navSpatialPointerForIndex(
  candidates: NavSpatialCandidates,
  index: number
): { x: number; y: number; path: number[] | null } {
  if (index < 0 || index >= candidates.boxes.length) {
    return { x: 0, y: 0, path: null }
  }
  const center = centerOfRect(candidates.boxes[index]!)
  return { x: center.x, y: center.y, path: candidates.paths[index]! }
}

/**
 * EN: Live viewport center + box for an element (call after any scroll that may move it).
 * JA: スクロール後に使う実要素のビューポート中心と矩形。
 */
export function syncNavSpatialCursorToElement(el: Element): {
  x: number
  y: number
  box: SpatialRect
} {
  const box = rectFromElement(el)
  const center = centerOfRect(box)
  return { x: center.x, y: center.y, box }
}

/**
 * EN: Scroll only if needed (`nearest`); instant so the nav cursor can re-sync immediately.
 * JA: 見えていれば動かさない。即時スクロール後にカーソル座標を合わせられるようにする。
 */
export function scrollNavSpatialTargetIntoView(el: Element): void {
  try {
    el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "auto" })
  } catch {
    el.scrollIntoView()
  }
}

export function resolveNavLinkClickTarget(el: Element): Element | null {
  const tag = el.tagName.toLowerCase()
  if (tag === "a" || tag === "area" || tag === "summary") {
    return el
  }
  const role = (el.getAttribute("role") ?? "").toLowerCase()
  if (role === "link") {
    return el
  }
  const href = (el.getAttribute("href") ?? "").trim()
  if (href.length > 0 && tag !== "base" && tag !== "link") {
    return el
  }
  return el.closest("a[href], area[href], [role='link'], summary")
}

export function isNavLinkTarget(el: Element | null): boolean {
  return resolveNavLinkClickTarget(el) !== null
}

/** EN: Prefer single `click()`; pointer cascade only when `click` is unavailable. */
export function navSpatialClickElement(el: Element): void {
  const htmlEl = el as HTMLElement
  if (typeof htmlEl.click === "function") {
    htmlEl.click()
    return
  }
  const rect = htmlEl.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  if (typeof MouseEvent === "function") {
    const opts: MouseEventInit = {
      bubbles: true,
      cancelable: true,
      view: globalThis.window ?? undefined,
      clientX: cx,
      clientY: cy,
      button: 0
    }
    htmlEl.dispatchEvent(new MouseEvent("pointerdown", opts))
    htmlEl.dispatchEvent(new MouseEvent("mousedown", opts))
    htmlEl.dispatchEvent(new MouseEvent("pointerup", opts))
    htmlEl.dispatchEvent(new MouseEvent("mouseup", opts))
    htmlEl.dispatchEvent(new MouseEvent("click", opts))
  }
}

export function identifyNavSpatialPath(path: readonly number[] | null): NavTargetIdentity | null {
  const el = resolveNavSpatialElement(path)
  if (!el) {
    return null
  }
  return identifyNavElement(el)
}

export function activateNavLinkAtPath(path: readonly number[]): boolean {
  const el = resolveNodeFromPath(path)
  if (!el) {
    return false
  }
  const target = resolveNavLinkClickTarget(el) ?? resolveNavRealTarget(el)
  if (!target) {
    return false
  }
  scrollNavSpatialTargetIntoView(target)
  const identity = identifyNavElement(target)
  const outcome = activateNavTargetByKind(target, identity.kind)
  return outcome.ok
}

export function activateNavSpatialPath(path: readonly number[]): {
  ok: boolean
  identity: NavTargetIdentity | null
} {
  const el = resolveNodeFromPath(path)
  if (!el) {
    return { ok: false, identity: null }
  }
  const target = resolveNavRealTarget(el)
  scrollNavSpatialTargetIntoView(target)
  const identity = identifyNavElement(target)
  if (identity.kind === "editable" || identity.kind === "inert") {
    return { ok: false, identity }
  }
  const outcome = activateNavTargetByKind(target, identity.kind)
  return { ok: outcome.ok, identity }
}

export function pathsEqualNav(a: readonly number[] | null, b: readonly number[] | null): boolean {
  if (a == null || b == null) {
    return a === b
  }
  return pathsEqual(a, b)
}
