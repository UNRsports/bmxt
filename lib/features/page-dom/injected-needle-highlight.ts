/**
 * EN: Robust in-page needle highlight for injected search scroll (CSS Highlight API + DOM wrap).
 * JA: 検索スクロール注入向け — サイト CSS に負けにくい強調表示。
 */

export const BMXT_SEARCH_HL_ATTR = "data-bmxt-search-hl"
const BMXT_SEARCH_HL_OVERLAY_ROOT = "data-bmxt-search-hl-overlay-root"
/** EN: Legacy single-layer name (snippet scroll / Enter jump). */
const BMXT_SEARCH_HIGHLIGHT_NAME = "bmxt-search-needle"
export const BMXT_SEARCH_HIT_HIGHLIGHT_NAME = "bmxt-search-hit"
export const BMXT_SEARCH_JUMP_HIGHLIGHT_NAME = "bmxt-search-jump"
const STYLE_ID = "bmxt-search-needle-highlight-style"
export const DEFAULT_NEEDLE_HIGHLIGHT_MS = 8000

export const DEFAULT_SEARCH_HIT_HIGHLIGHT_BG = "#ffc9dd"
export const DEFAULT_SEARCH_JUMP_HIGHLIGHT_BG = "#ffdb4d"
export const DEFAULT_SEARCH_HIGHLIGHT_FG = "#0d1117"

export type BmxtNeedleHighlightColors = {
  hitBg: string
  jumpBg: string
  fg: string
}

export const DEFAULT_BMXT_NEEDLE_HIGHLIGHT_COLORS: BmxtNeedleHighlightColors = {
  hitBg: DEFAULT_SEARCH_HIT_HIGHLIGHT_BG,
  jumpBg: DEFAULT_SEARCH_JUMP_HIGHLIGHT_BG,
  fg: DEFAULT_SEARCH_HIGHLIGHT_FG
}

type CssHighlightRegistry = {
  set: (name: string, highlight: unknown) => void
  delete: (name: string) => void
}

let clearTimerId: number | null = null

function cssHighlightRegistry(): CssHighlightRegistry | null {
  const css = CSS as typeof CSS & { highlights?: CssHighlightRegistry }
  if (!css.highlights) {
    return null
  }
  return css.highlights
}

function createCssHighlight(...ranges: Range[]): unknown | null {
  const HighlightCtor = (globalThis as { Highlight?: new (...ranges: Range[]) => unknown }).Highlight
  if (!HighlightCtor || ranges.length === 0) {
    return null
  }
  try {
    return new HighlightCtor(...ranges)
  } catch {
    return null
  }
}

function cancelClearTimer(): void {
  if (clearTimerId !== null) {
    window.clearTimeout(clearTimerId)
    clearTimerId = null
  }
}

function scheduleClearTimer(persistMs: number): void {
  cancelClearTimer()
  if (persistMs <= 0) {
    return
  }
  clearTimerId = window.setTimeout(() => {
    clearBmxtNeedleHighlights()
  }, persistMs)
}

function ensureHighlightStyles(colors: BmxtNeedleHighlightColors): void {
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null
  if (!style) {
    style = document.createElement("style")
    style.id = STYLE_ID
    ;(document.head ?? document.documentElement).appendChild(style)
  }
  style.textContent = `
    ::highlight(${BMXT_SEARCH_HIT_HIGHLIGHT_NAME}) {
      background-color: ${colors.hitBg};
      color: ${colors.fg};
    }
    ::highlight(${BMXT_SEARCH_JUMP_HIGHLIGHT_NAME}) {
      background-color: ${colors.jumpBg};
      color: ${colors.fg};
    }
    ::highlight(${BMXT_SEARCH_HIGHLIGHT_NAME}) {
      background-color: ${colors.jumpBg};
      color: ${colors.fg};
    }
  `
}

function deleteCssHighlights(registry: CssHighlightRegistry): void {
  try {
    registry.delete(BMXT_SEARCH_HIT_HIGHLIGHT_NAME)
    registry.delete(BMXT_SEARCH_JUMP_HIGHLIGHT_NAME)
    registry.delete(BMXT_SEARCH_HIGHLIGHT_NAME)
  } catch {
    /* ignore */
  }
}

function styleHighlightElement(el: HTMLElement, bg: string, fg: string): void {
  el.setAttribute(BMXT_SEARCH_HL_ATTR, "1")
  el.style.setProperty("background-color", bg, "important")
  el.style.setProperty("color", fg, "important")
  el.style.setProperty("border-radius", "2px", "important")
  el.style.setProperty("padding", "0 1px", "important")
  el.style.setProperty("box-decoration-break", "clone", "important")
  el.style.setProperty("-webkit-box-decoration-break", "clone", "important")
}

/** EN: Remove prior BMXt search highlights (Highlight API, marks, overlays). */
export function clearBmxtNeedleHighlights(): void {
  cancelClearTimer()
  const registry = cssHighlightRegistry()
  if (registry) {
    deleteCssHighlights(registry)
  }

  document.querySelectorAll(`[${BMXT_SEARCH_HL_ATTR}]`).forEach((node) => {
    const mark = node
    const parent = mark.parentNode
    if (!parent) {
      return
    }
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark)
    }
    parent.removeChild(mark)
    parent.normalize()
  })

  document.querySelectorAll(`[${BMXT_SEARCH_HL_OVERLAY_ROOT}]`).forEach((node) => {
    node.remove()
  })
}

function scrollRangeIntoView(range: Range): void {
  const el =
    range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? (range.commonAncestorContainer as Element)
      : range.commonAncestorContainer.parentElement
  try {
    el?.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" })
  } catch {
    el?.scrollIntoView()
  }
}

function applyNamedCssHighlight(name: string, ...ranges: Range[]): boolean {
  const registry = cssHighlightRegistry()
  if (!registry || ranges.length === 0) {
    return false
  }
  const highlight = createCssHighlight(...ranges)
  if (!highlight) {
    return false
  }
  try {
    registry.set(name, highlight)
    return true
  } catch {
    return false
  }
}

function wrapRangeWithHighlightSpan(
  source: Range,
  bg: string,
  fg: string
): HTMLElement | null {
  const span = document.createElement("span")
  styleHighlightElement(span, bg, fg)

  const surround = source.cloneRange()
  try {
    surround.surroundContents(span)
    return span
  } catch {
    /* partial node split — extract and re-insert */
  }

  const extract = source.cloneRange()
  try {
    const fragment = extract.extractContents()
    span.appendChild(fragment)
    extract.insertNode(span)
    return span
  } catch {
    return null
  }
}

function overlayHighlightRange(range: Range, bg: string): boolean {
  const rects = Array.from(range.getClientRects()).filter(
    (rect) => rect.width > 0 || rect.height > 0
  )
  if (rects.length === 0) {
    const rect = range.getBoundingClientRect()
    if (rect.width <= 0 && rect.height <= 0) {
      return false
    }
    rects.push(rect)
  }

  const root = document.createElement("div")
  root.setAttribute(BMXT_SEARCH_HL_OVERLAY_ROOT, "1")
  root.style.cssText =
    "position:fixed;inset:0;pointer-events:none;z-index:2147483646;overflow:visible;"

  for (const rect of rects) {
    const box = document.createElement("div")
    box.style.cssText = [
      "position:fixed",
      `left:${rect.left}px`,
      `top:${rect.top}px`,
      `width:${Math.max(rect.width, 2)}px`,
      `height:${Math.max(rect.height, 16)}px`,
      `background:${bg}`,
      "border-radius:2px",
      "pointer-events:none",
      "box-sizing:border-box"
    ].join(";")
    root.appendChild(box)
  }

  ;(document.body ?? document.documentElement).appendChild(root)
  return true
}

function scheduleOverlayRefresh(range: Range, bg: string, persistMs: number): void {
  const refresh = (): void => {
    document.querySelectorAll(`[${BMXT_SEARCH_HL_OVERLAY_ROOT}]`).forEach((node) => {
      node.remove()
    })
    overlayHighlightRange(range, bg)
  }
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(refresh)
  })
  window.setTimeout(refresh, 320)
  scheduleClearTimer(persistMs)
}

/**
 * EN: Scroll to `range` and highlight the needle — prefers CSS Highlight API, then DOM wrap,
 *     then a fixed overlay when wrapping is impossible.
 */
export function applyBmxtNeedleHighlight(
  range: Range,
  persistMs = DEFAULT_NEEDLE_HIGHLIGHT_MS,
  colors: BmxtNeedleHighlightColors = DEFAULT_BMXT_NEEDLE_HIGHLIGHT_COLORS
): boolean {
  clearBmxtNeedleHighlights()
  scrollRangeIntoView(range)

  ensureHighlightStyles(colors)
  let highlighted = false
  let overlayScheduled = false

  if (applyNamedCssHighlight(BMXT_SEARCH_HIGHLIGHT_NAME, range)) {
    highlighted = true
  } else if (wrapRangeWithHighlightSpan(range, colors.jumpBg, colors.fg)) {
    highlighted = true
  } else if (overlayHighlightRange(range, colors.jumpBg)) {
    highlighted = true
    overlayScheduled = true
    scheduleOverlayRefresh(range, colors.jumpBg, persistMs)
  }

  if (!highlighted) {
    return false
  }

  if (!overlayScheduled) {
    scheduleClearTimer(persistMs)
  }
  return true
}

/**
 * EN: Detail-picker session — all hits + active jump target (separate colors).
 * JA: 詳細ピッカー用 — 全ヒットとジャンプ先を別色で表示する。
 */
export function applyBmxtSearchNeedleHighlightSession(
  allRanges: readonly Range[],
  activeRange: Range,
  colors: BmxtNeedleHighlightColors = DEFAULT_BMXT_NEEDLE_HIGHLIGHT_COLORS,
  options?: { activeOnly?: boolean; persistMs?: number }
): boolean {
  if (!activeRange) {
    return false
  }

  ensureHighlightStyles(colors)

  if (!options?.activeOnly) {
    clearBmxtNeedleHighlights()
    scrollRangeIntoView(activeRange)
    const hitRanges = allRanges.length > 0 ? [...allRanges] : [activeRange]
    if (!applyNamedCssHighlight(BMXT_SEARCH_HIT_HIGHLIGHT_NAME, ...hitRanges)) {
      return applyBmxtNeedleHighlight(activeRange, options?.persistMs ?? 0, colors)
    }
    if (!applyNamedCssHighlight(BMXT_SEARCH_JUMP_HIGHLIGHT_NAME, activeRange)) {
      return false
    }
    scheduleClearTimer(options?.persistMs ?? 0)
    return true
  }

  cancelClearTimer()
  scrollRangeIntoView(activeRange)
  if (!applyNamedCssHighlight(BMXT_SEARCH_JUMP_HIGHLIGHT_NAME, activeRange)) {
    return applyBmxtNeedleHighlight(activeRange, 0, colors)
  }
  return true
}

/** @deprecated Use `applyBmxtSearchNeedleHighlightSession`. */
export function applyBmxtNeedleHighlights(
  ranges: readonly Range[],
  activeRange?: Range,
  persistMs = DEFAULT_NEEDLE_HIGHLIGHT_MS
): boolean {
  const scrollTarget = activeRange ?? ranges[0]
  if (!scrollTarget) {
    return false
  }
  return applyBmxtSearchNeedleHighlightSession(ranges, scrollTarget, DEFAULT_BMXT_NEEDLE_HIGHLIGHT_COLORS, {
    persistMs
  })
}
