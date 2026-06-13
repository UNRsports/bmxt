/**
 * EN: Robust in-page needle highlight for injected search scroll (CSS Highlight API + DOM wrap).
 * JA: 検索スクロール注入向け — サイト CSS に負けにくい強調表示。
 */

export const BMXT_SEARCH_HL_ATTR = "data-bmxt-search-hl"
const BMXT_SEARCH_HL_OVERLAY_ROOT = "data-bmxt-search-hl-overlay-root"
const BMXT_SEARCH_HIGHLIGHT_NAME = "bmxt-search-needle"
const STYLE_ID = "bmxt-search-needle-highlight-style"
export const DEFAULT_NEEDLE_HIGHLIGHT_MS = 8000

const HL_BG = "rgba(255, 201, 221, 0.95)"
const HL_FG = "#0d1117"

type CssHighlightRegistry = {
  set: (name: string, highlight: unknown) => void
  delete: (name: string) => void
}

function cssHighlightRegistry(): CssHighlightRegistry | null {
  const css = CSS as typeof CSS & { highlights?: CssHighlightRegistry }
  if (!css.highlights) {
    return null
  }
  return css.highlights
}

function createCssHighlight(range: Range): unknown | null {
  const HighlightCtor = (globalThis as { Highlight?: new (range: Range) => unknown }).Highlight
  if (!HighlightCtor) {
    return null
  }
  try {
    return new HighlightCtor(range)
  } catch {
    return null
  }
}

function ensureHighlightStyles(): void {
  if (document.getElementById(STYLE_ID)) {
    return
  }
  const style = document.createElement("style")
  style.id = STYLE_ID
  style.textContent = `
    ::highlight(${BMXT_SEARCH_HIGHLIGHT_NAME}) {
      background-color: ${HL_BG};
      color: ${HL_FG};
    }
  `
  ;(document.head ?? document.documentElement).appendChild(style)
}

function styleHighlightElement(el: HTMLElement): void {
  el.setAttribute(BMXT_SEARCH_HL_ATTR, "1")
  el.style.setProperty("background-color", HL_BG, "important")
  el.style.setProperty("color", HL_FG, "important")
  el.style.setProperty("border-radius", "2px", "important")
  el.style.setProperty("padding", "0 1px", "important")
  el.style.setProperty("box-decoration-break", "clone", "important")
  el.style.setProperty("-webkit-box-decoration-break", "clone", "important")
}

/** EN: Remove prior BMXt search highlights (Highlight API, marks, overlays). */
export function clearBmxtNeedleHighlights(): void {
  const registry = cssHighlightRegistry()
  if (registry) {
    try {
      registry.delete(BMXT_SEARCH_HIGHLIGHT_NAME)
    } catch {
      /* ignore */
    }
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

function applyCssHighlight(range: Range): boolean {
  const registry = cssHighlightRegistry()
  if (!registry) {
    return false
  }
  const highlight = createCssHighlight(range)
  if (!highlight) {
    return false
  }
  try {
    ensureHighlightStyles()
    registry.set(BMXT_SEARCH_HIGHLIGHT_NAME, highlight)
    return true
  } catch {
    return false
  }
}

function wrapRangeWithHighlightSpan(source: Range): HTMLElement | null {
  const span = document.createElement("span")
  styleHighlightElement(span)

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

function overlayHighlightRange(range: Range): boolean {
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
      `background:${HL_BG}`,
      "border-radius:2px",
      "pointer-events:none",
      "box-sizing:border-box"
    ].join(";")
    root.appendChild(box)
  }

  ;(document.body ?? document.documentElement).appendChild(root)
  return true
}

function scheduleOverlayRefresh(range: Range, persistMs: number): void {
  const refresh = (): void => {
    document.querySelectorAll(`[${BMXT_SEARCH_HL_OVERLAY_ROOT}]`).forEach((node) => {
      node.remove()
    })
    overlayHighlightRange(range)
  }
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(refresh)
  })
  window.setTimeout(refresh, 320)
  window.setTimeout(() => {
    clearBmxtNeedleHighlights()
  }, persistMs)
}

/**
 * EN: Scroll to `range` and highlight the needle — prefers CSS Highlight API, then DOM wrap,
 *     then a fixed overlay when wrapping is impossible.
 */
export function applyBmxtNeedleHighlight(range: Range, persistMs = DEFAULT_NEEDLE_HIGHLIGHT_MS): boolean {
  clearBmxtNeedleHighlights()
  scrollRangeIntoView(range)

  let highlighted = false
  let overlayScheduled = false

  if (applyCssHighlight(range)) {
    highlighted = true
  } else if (wrapRangeWithHighlightSpan(range)) {
    highlighted = true
  } else if (overlayHighlightRange(range)) {
    highlighted = true
    overlayScheduled = true
    scheduleOverlayRefresh(range, persistMs)
  }

  if (!highlighted) {
    return false
  }

  if (!overlayScheduled) {
    window.setTimeout(() => {
      clearBmxtNeedleHighlights()
    }, persistMs)
  }
  return true
}
