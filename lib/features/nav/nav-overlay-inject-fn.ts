/**
 * EN: Injected function for `chrome.scripting.executeScript` — must live in the SW bundle
 *     with the caller (`run-nav-inject.ts`). Spatial helpers live in `nav-spatial-in-page.ts`.
 * JA: `executeScript` 用。矩形スナップは `nav-spatial-in-page.ts`。
 */

import {
  activateNavLinkAtPath,
  clearNavSpatialHighlight,
  collectNavSpatialCandidates,
  isNavLinkTarget,
  navSpatialClickElement,
  navSpatialMoveIndex,
  navSpatialPointerForIndex,
  pickInitialNavSpatialIndex,
  resolveNavSpatialElement,
  scrollNavSpatialTargetIntoView,
  setNavSpatialHighlight,
  syncNavSpatialSelectionIndex,
  type NavSpatialCandidates
} from "./nav-spatial-in-page.ts"

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
  | "applyTyping"
  | "revertTyping"
  | "toggleMenu"
  | "menuInput"
  | "textSelMark"
  | "textSelCancel"

export type NavInjectTextSelPhase = "idle" | "start" | "end" | "done"
export type NavInjectMenuVariant = "default" | "copy"

export type NavInjectResult =
  | {
      ok: true
      x: number
      y: number
      editableFocused?: boolean
      typingMultiline?: boolean
      initialValue?: string
      menuOpen?: boolean
      textSelPhase?: NavInjectTextSelPhase
      menuVariant?: NavInjectMenuVariant
      /** EN: Plain text to copy in BMXt (user gesture); set by copy menu action. */
      navCopiedText?: string
    }
  | { ok: false; reason?: string }

/** Keep in sync with `entrypoints/bmxt-nav-overlay.content/`. */
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
  labelsJson?: string
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
  text = "",
  labelsJson = ""
): NavInjectResult {
  const ROOT_ID = "__bmxt_nav_cursor_root__"
  const NAV_CURSOR_SCALE = 1.1
  const NAV_SCROLL_MARGIN = 32
  const NAV_MENU_TOP_PX = Math.round(22 * NAV_CURSOR_SCALE) + 6
  /** EN: Keep in sync with `nav-menu-items.ts` (`NAV_MENU_ITEMS` order). */
  const MENU_ITEM_IDS = ["selectText", "saveImage", "reloadPage"]
  const COPY_MENU_ITEM_IDS = ["copySelection"]
  const LABELS_FALLBACK = {
    selectText: "テキスト選択",
    saveImage: "カーソル下の画像を保存",
    reloadPage: "ページを再読み込み",
    copySelection: "コピー",
    historyBack: "履歴を戻る",
    historyForward: "履歴を進む",
    menuSelectHint: "↑↓ · Enter",
    menuCopyHint: "Enter",
    textSelStart: "選択開始: Enter · Esc 取消",
    textSelEnd: "選択終了: Enter 確定 · 移動で範囲プレビュー · Esc 取消",
    typingLine1: "BMXt ウィンドウで入力",
    typingLine2: "入力したテキストがここに反映されます",
    typingMultiline: "Shift+Enter で改行"
  }
  type OverlayLabels = typeof LABELS_FALLBACK
  let parsedLabels: OverlayLabels = LABELS_FALLBACK
  if (labelsJson) {
    try {
      const o = JSON.parse(labelsJson) as Partial<OverlayLabels>
      if (typeof o.selectText === "string" && typeof o.saveImage === "string") {
        parsedLabels = { ...LABELS_FALLBACK, ...o }
      }
    } catch {
      /* keep fallback */
    }
  }
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
    typingSnapshot: string | null
    typingMultiline: boolean
    typingActive: boolean
    menuOpen: boolean
    menuIndex: number
    menuVariant: NavInjectMenuVariant
    textSelPhase: NavInjectTextSelPhase
    textSelStartX: number
    textSelStartY: number
    labels: OverlayLabels
    spatialPaths: number[][]
    spatialBoxes: NavSpatialCandidates["boxes"]
    spatialIndex: number
    selectedPath: number[] | null
  }

  function sessionWin(): { bmxtNav?: NavSession } {
    return window as unknown as { bmxtNav?: NavSession }
  }

  function normalizeSession(sess: NavSession): void {
    if (sess.menuVariant !== "copy" && sess.menuVariant !== "default") {
      sess.menuVariant = "default"
    }
    if (
      sess.textSelPhase !== "idle" &&
      sess.textSelPhase !== "start" &&
      sess.textSelPhase !== "end" &&
      sess.textSelPhase !== "done"
    ) {
      sess.textSelPhase = "idle"
    }
    if (typeof sess.textSelStartX !== "number") {
      sess.textSelStartX = 0
    }
    if (typeof sess.textSelStartY !== "number") {
      sess.textSelStartY = 0
    }
    if (!Array.isArray(sess.spatialPaths)) {
      sess.spatialPaths = []
    }
    if (!Array.isArray(sess.spatialBoxes)) {
      sess.spatialBoxes = []
    }
    if (typeof sess.spatialIndex !== "number") {
      sess.spatialIndex = -1
    }
    if (sess.selectedPath != null && !Array.isArray(sess.selectedPath)) {
      sess.selectedPath = null
    }
  }

  function getSession(): NavSession | null {
    const sess = sessionWin().bmxtNav ?? null
    if (sess) {
      normalizeSession(sess)
    }
    return sess
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

  function scrollCursorIntoView(cx: number, cy: number): void {
    const margin = NAV_SCROLL_MARGIN
    let dx = 0
    let dy = 0
    const vw = window.innerWidth
    const vh = window.innerHeight
    if (cx < margin) {
      dx = cx - margin
    } else if (cx > vw - margin) {
      dx = cx - (vw - margin)
    }
    if (cy < margin) {
      dy = cy - margin
    } else if (cy > vh - margin) {
      dy = cy - (vh - margin)
    }
    if (dx !== 0 || dy !== 0) {
      window.scrollBy(dx, dy)
    }
    const hit = document.elementFromPoint(
      clampCoord(cx, Math.max(0, vw - 1)),
      clampCoord(cy, Math.max(0, vh - 1))
    )
    let node: Element | null = hit
    while (node && node !== document.documentElement) {
      if (!(node instanceof HTMLElement)) {
        node = node.parentElement
        continue
      }
      const st = getComputedStyle(node)
      const scrollableY =
        (st.overflowY === "auto" || st.overflowY === "scroll") &&
        node.scrollHeight > node.clientHeight + 1
      const scrollableX =
        (st.overflowX === "auto" || st.overflowX === "scroll") &&
        node.scrollWidth > node.clientWidth + 1
      if (scrollableY || scrollableX) {
        const rect = node.getBoundingClientRect()
        if (scrollableY) {
          if (cy < rect.top + margin) {
            node.scrollTop += cy - rect.top - margin
          } else if (cy > rect.bottom - margin) {
            node.scrollTop += cy - (rect.bottom - margin)
          }
        }
        if (scrollableX) {
          if (cx < rect.left + margin) {
            node.scrollLeft += cx - rect.left - margin
          } else if (cx > rect.right - margin) {
            node.scrollLeft += cx - (rect.right - margin)
          }
        }
      }
      node = node.parentElement
    }
  }

  function activeMenuItemIds(sess: NavSession): string[] {
    return sess.menuVariant === "copy" ? COPY_MENU_ITEM_IDS : MENU_ITEM_IDS
  }

  function navOk(sess: NavSession, extra: Record<string, unknown> = {}): NavInjectResult {
    return {
      ok: true,
      x: sess.x,
      y: sess.y,
      menuOpen: sess.menuOpen,
      textSelPhase: sess.textSelPhase,
      menuVariant: sess.menuVariant,
      ...extra
    }
  }

  function createMenuElement(sess: NavSession): HTMLElement | null {
    if (!sess.menuOpen) {
      return null
    }

    const labels = sess.labels

    const container = document.createElement("div")
    container.setAttribute("data-bmxt-nav-menu", "1")
    container.style.cssText = "position:absolute;left:0;top:" + NAV_MENU_TOP_PX + "px;min-width:200px;max-width:280px;padding:4px 0;font:600 11px system-ui,sans-serif;color:#f0f6fc;background:rgba(15,23,42,0.95);border:1px solid rgba(255,255,255,0.25);border-radius:6px;box-shadow:0 4px 14px rgba(0,0,0,0.4);pointer-events:none"

    const rowBase =
      "display:flex;justify-content:space-between;gap:10px;padding:5px 8px;" +
      "font:500 11px/1.35 system-ui,sans-serif;color:#e6edf3;cursor:default;"
    const hintStyle = "font-size:10px;color:#8b949e;font-weight:400;white-space:nowrap"

    const itemIds = activeMenuItemIds(sess)
    for (let i = 0; i < itemIds.length; i++) {
      const id = itemIds[i]!
      const selected = i === sess.menuIndex
      const hint = sess.menuVariant === "copy" ? labels.menuCopyHint : labels.menuSelectHint

      const row = document.createElement("div")
      row.setAttribute("data-bmxt-nav-menu-item", id)
      row.style.cssText = rowBase
      if (selected) {
        row.style.background = "rgba(88,166,255,0.28)"
      }

      const labelSpan = document.createElement("span")
      labelSpan.textContent =
        id === "selectText"
          ? labels.selectText
          : id === "saveImage"
            ? labels.saveImage
            : id === "reloadPage"
              ? labels.reloadPage
              : id === "copySelection"
                ? labels.copySelection
                : id
      row.appendChild(labelSpan)

      const hintSpan = document.createElement("span")
      hintSpan.style.cssText = hintStyle
      hintSpan.textContent = hint
      row.appendChild(hintSpan)

      container.appendChild(row)
    }

    if (sess.menuVariant !== "copy") {
      const historyBlock = document.createElement("div")
      historyBlock.style.cssText = "border-top:1px solid rgba(255,255,255,0.15);margin-top:2px;padding-top:2px"

      const backRow = document.createElement("div")
      backRow.style.cssText = rowBase
      const backLabelSpan = document.createElement("span")
      backLabelSpan.textContent = labels.historyBack
      backRow.appendChild(backLabelSpan)
      const backHintSpan = document.createElement("span")
      backHintSpan.style.cssText = hintStyle
      backHintSpan.textContent = "←"
      backRow.appendChild(backHintSpan)
      historyBlock.appendChild(backRow)

      const fwdRow = document.createElement("div")
      fwdRow.style.cssText = rowBase
      const fwdLabelSpan = document.createElement("span")
      fwdLabelSpan.textContent = labels.historyForward
      fwdRow.appendChild(fwdLabelSpan)
      const fwdHintSpan = document.createElement("span")
      fwdHintSpan.style.cssText = hintStyle
      fwdHintSpan.textContent = "→"
      fwdRow.appendChild(fwdHintSpan)
      historyBlock.appendChild(fwdRow)

      container.appendChild(historyBlock)
    }

    return container
  }

  function clearPageSelection(): void {
    const sel = window.getSelection()
    if (sel) {
      sel.removeAllRanges()
    }
  }

  function createTextSelHintElement(phase: "start" | "end", labels: OverlayLabels): HTMLElement {
    const label = phase === "start" ? labels.textSelStart : labels.textSelEnd

    const div = document.createElement("div")
    div.setAttribute("data-bmxt-nav-textsel-hint", "1")
    div.style.cssText = "margin-top:4px;padding:4px 8px;max-width:220px;font:600 11px/1.35 system-ui,sans-serif;color:#f0f6fc;background:rgba(88,166,255,0.2);border:1px solid rgba(88,166,255,0.45);border-radius:6px;pointer-events:none"
    div.textContent = label

    return div
  }

  function rangeAtPoint(cx: number, cy: number): Range | null {
    if (typeof document.caretRangeFromPoint === "function") {
      return document.caretRangeFromPoint(cx, cy)
    }
    const doc = document as Document & {
      caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null
    }
    if (typeof doc.caretPositionFromPoint === "function") {
      const pos = doc.caretPositionFromPoint(cx, cy)
      if (pos) {
        const range = document.createRange()
        range.setStart(pos.offsetNode, pos.offset)
        range.collapse(true)
        return range
      }
    }
    return null
  }

  function selectBetweenPoints(sx: number, sy: number, ex: number, ey: number): boolean {
    const r1 = rangeAtPoint(sx, sy)
    const r2 = rangeAtPoint(ex, ey)
    const sel = window.getSelection()
    if (!sel) {
      return false
    }
    sel.removeAllRanges()
    if (r1 && r2) {
      const range = document.createRange()
      if (r1.compareBoundaryPoints(Range.START_TO_START, r2) <= 0) {
        range.setStart(r1.startContainer, r1.startOffset)
        range.setEnd(r2.endContainer, r2.endOffset)
      } else {
        range.setStart(r2.startContainer, r2.startOffset)
        range.setEnd(r1.endContainer, r1.endOffset)
      }
      sel.addRange(range)
      return true
    }
    const el = document.elementFromPoint(ex, ey) ?? document.elementFromPoint(sx, sy)
    if (el) {
      try {
        const range = document.createRange()
        range.selectNodeContents(el)
        sel.addRange(range)
        return true
      } catch {
        return false
      }
    }
    return false
  }

  function readSelectionPlainText(): string {
    return window.getSelection()?.toString() ?? ""
  }

  function resetTextSel(sess: NavSession): void {
    sess.textSelPhase = "idle"
    sess.textSelStartX = 0
    sess.textSelStartY = 0
    sess.menuVariant = "default"
  }

  function beginTextSelect(sess: NavSession): void {
    resetTextSel(sess)
    sess.textSelPhase = "start"
    sess.menuOpen = false
    sess.menuIndex = 0
    renderOverlayRoot(sess)
  }

  function markTextSelPoint(sess: NavSession): void {
    if (sess.textSelPhase === "start") {
      sess.textSelStartX = sess.x
      sess.textSelStartY = sess.y
      sess.textSelPhase = "end"
      previewTextSelection(sess)
      renderOverlayRoot(sess)
      return
    }
    if (sess.textSelPhase === "end") {
      selectBetweenPoints(sess.textSelStartX, sess.textSelStartY, sess.x, sess.y)
      sess.textSelPhase = "done"
      sess.menuVariant = "copy"
      sess.menuOpen = true
      sess.menuIndex = 0
      renderOverlayRoot(sess)
    }
  }

  function previewTextSelection(sess: NavSession): void {
    if (sess.textSelPhase !== "end") {
      return
    }
    selectBetweenPoints(sess.textSelStartX, sess.textSelStartY, sess.x, sess.y)
  }

  function cancelTextSelect(sess: NavSession): void {
    clearPageSelection()
    resetTextSel(sess)
    sess.menuOpen = false
    sess.menuIndex = 0
    renderOverlayRoot(sess)
  }

  function saveImageAtPoint(cx: number, cy: number): boolean {
    const hit = document.elementFromPoint(cx, cy)
    if (!hit) {
      return false
    }
    const img =
      hit instanceof HTMLImageElement ? hit : hit.closest("img")
    if (!img || !(img instanceof HTMLImageElement)) {
      return false
    }
    const src = img.currentSrc || img.src
    if (!src) {
      return false
    }
    const tail = src.split("/").pop()?.split("?")[0] ?? ""
    const filename = tail.length > 0 ? tail : "bmxt-nav-image.png"
    void (async () => {
      const downloadBlob = (blob: Blob): void => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = filename
        a.style.display = "none"
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
      }
      try {
        if (!img.complete) {
          await new Promise<void>((resolve, reject) => {
            img.addEventListener("load", () => resolve(), { once: true })
            img.addEventListener("error", () => reject(new Error("img-load")), { once: true })
          })
        }
        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
          const canvas = document.createElement("canvas")
          canvas.width = img.naturalWidth
          canvas.height = img.naturalHeight
          const ctx = canvas.getContext("2d")
          if (ctx) {
            ctx.drawImage(img, 0, 0)
            const blob = await new Promise<Blob | null>((resolve) => {
              canvas.toBlob((b) => resolve(b), "image/png")
            })
            if (blob) {
              downloadBlob(blob)
              return
            }
          }
        }
      } catch {
        /* tainted canvas or load failed */
      }
      try {
        const a = document.createElement("a")
        a.href = src
        a.download = filename
        a.style.display = "none"
        document.body.appendChild(a)
        a.click()
        a.remove()
      } catch {
        window.open(src, "_blank", "noopener,noreferrer")
      }
    })()
    return true
  }

  type MenuActionOutcome = {
    disposition: "keepOpen" | "closed"
    navCopiedText?: string
  }

  function runMenuAction(sess: NavSession, itemId: string): MenuActionOutcome {
    if (itemId === "selectText") {
      beginTextSelect(sess)
      return { disposition: "keepOpen" }
    }
    if (itemId === "copySelection") {
      const text = readSelectionPlainText()
      cancelTextSelect(sess)
      return { disposition: "closed", navCopiedText: text.length > 0 ? text : undefined }
    }
    if (itemId === "saveImage") {
      saveImageAtPoint(sess.x, sess.y)
      return { disposition: "closed" }
    }
    if (itemId === "reloadPage") {
      window.location.reload()
      return { disposition: "closed" }
    }
    return { disposition: "closed" }
  }

  function closeMenu(sess: NavSession): void {
    if (sess.menuVariant === "copy" || sess.textSelPhase !== "idle") {
      cancelTextSelect(sess)
      return
    }
    sess.menuOpen = false
    sess.menuIndex = 0
    renderOverlayRoot(sess)
  }

  function openMenu(sess: NavSession): void {
    if (sess.typingActive) {
      endTypingUi(sess)
    }
    if (sess.textSelPhase !== "idle") {
      cancelTextSelect(sess)
    }
    sess.menuOpen = true
    sess.menuIndex = 0
    renderOverlayRoot(sess)
  }

  function removeSession(): void {
    clearNavSpatialHighlight()
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

  function createPointerSvgElement(): SVGElement {
    const w = Math.round(16 * NAV_CURSOR_SCALE)
    const h = Math.round(22 * NAV_CURSOR_SCALE)

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    svg.setAttribute("width", String(w))
    svg.setAttribute("height", String(h))
    svg.setAttribute("viewBox", "0 0 16 22")
    svg.setAttribute("aria-hidden", "true")
    svg.style.display = "block"
    svg.style.filter = "drop-shadow(0 0 2px #000)"

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
    path.setAttribute("fill", "#fff")
    path.setAttribute("stroke", "#111")
    path.setAttribute("stroke-width", "1.1")
    path.setAttribute("d", "M1 1 L1 19 L5.5 14.5 L9 21 L11.5 19.5 L8 13 L14 13 Z")

    svg.appendChild(path)
    return svg
  }

  function createTypingHintElement(multiline: boolean, labels: OverlayLabels): HTMLElement {
    const div = document.createElement("div")
    div.setAttribute("data-bmxt-nav-hint", "1")
    div.style.cssText = "margin-top:4px;padding:4px 8px;max-width:220px;font:600 11px/1.35 system-ui,sans-serif;color:#f0f6fc;background:rgba(15,23,42,0.92);border:1px solid rgba(255,255,255,0.25);border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,0.35);white-space:normal;pointer-events:none;line-height:1.35"

    const span1 = document.createElement("span")
    span1.style.display = "block"
    span1.textContent = labels.typingLine1
    div.appendChild(span1)

    const span2 = document.createElement("span")
    span2.style.cssText = "display:block;margin-top:2px;font-weight:500;opacity:0.9;font-size:10px"
    span2.textContent = labels.typingLine2
    div.appendChild(span2)

    if (multiline) {
      const span3 = document.createElement("span")
      span3.style.cssText = "display:block;margin-top:2px;opacity:0.85"
      span3.textContent = labels.typingMultiline
      div.appendChild(span3)
    }

    return div
  }

  function renderOverlayRoot(sess: NavSession): void {
    sess.root.textContent = ""
    sess.root.appendChild(createPointerSvgElement())

    if (sess.typingActive) {
      sess.root.appendChild(createTypingHintElement(sess.typingMultiline, sess.labels))
    } else if (sess.textSelPhase === "start" || sess.textSelPhase === "end") {
      sess.root.appendChild(createTextSelHintElement(sess.textSelPhase, sess.labels))
    }

    const menu = createMenuElement(sess)
    if (menu) {
      sess.root.appendChild(menu)
    }
  }

  function readEditableValue(target: HTMLElement): string {
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      return target.value
    }
    if (target.isContentEditable) {
      return target.innerText
    }
    return ""
  }

  function writeEditableValue(target: HTMLElement, value: string): boolean {
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      target.value = value
      try {
        const len = value.length
        target.setSelectionRange(len, len)
      } catch {
        /* ignore */
      }
      dispatchInputEvent(target, "insertReplacementText", value)
      target.dispatchEvent(new Event("change", { bubbles: true }))
      return true
    }
    if (target.isContentEditable) {
      target.focus()
      target.innerText = value
      dispatchInputEvent(target, "insertReplacementText", value)
      return true
    }
    return false
  }

  function isMultilineEditable(target: HTMLElement): boolean {
    if (target instanceof HTMLTextAreaElement) {
      return true
    }
    if (target.isContentEditable) {
      return true
    }
    return false
  }

  function endTypingUi(sess: NavSession): void {
    if (sess.typingEl) {
      sess.typingEl.blur()
    }
    sess.typingEl = null
    sess.typingSnapshot = null
    sess.typingMultiline = false
    sess.typingActive = false
    renderOverlayRoot(sess)
  }

  function beginTypingUi(sess: NavSession, target: HTMLElement): {
    typingMultiline: boolean
    initialValue: string
  } {
    sess.typingEl = target
    sess.typingSnapshot = readEditableValue(target)
    sess.typingMultiline = isMultilineEditable(target)
    sess.typingActive = true
    renderOverlayRoot(sess)
    return { typingMultiline: sess.typingMultiline, initialValue: sess.typingSnapshot }
  }

  function spatialCandidatesFromSession(sess: NavSession): NavSpatialCandidates {
    return { paths: sess.spatialPaths, boxes: sess.spatialBoxes }
  }

  function refreshSpatialCandidates(sess: NavSession): void {
    const collected = collectNavSpatialCandidates()
    sess.spatialPaths = collected.paths
    sess.spatialBoxes = collected.boxes
    sess.spatialIndex = syncNavSpatialSelectionIndex(collected, sess.selectedPath)
  }

  function applySpatialIndex(sess: NavSession, index: number): void {
    const candidates = spatialCandidatesFromSession(sess)
    const pointer = navSpatialPointerForIndex(candidates, index)
    sess.spatialIndex = index
    sess.selectedPath = pointer.path
    sess.x = pointer.x
    sess.y = pointer.y
    sess.root.style.left = sess.x + "px"
    sess.root.style.top = sess.y + "px"
    const el = resolveNavSpatialElement(pointer.path)
    if (el) {
      scrollNavSpatialTargetIntoView(el)
      setNavSpatialHighlight(el)
    } else {
      setNavSpatialHighlight(null)
      scrollCursorIntoView(sess.x, sess.y)
    }
  }

  function initSpatialSelection(sess: NavSession, px: number, py: number): void {
    refreshSpatialCandidates(sess)
    const candidates = spatialCandidatesFromSession(sess)
    if (candidates.paths.length === 0) {
      sess.spatialIndex = -1
      sess.selectedPath = null
      return
    }
    const index = pickInitialNavSpatialIndex(candidates, px, py)
    applySpatialIndex(sess, index)
  }

  function spatialMoveSelection(sess: NavSession, dx: number, dy: number): void {
    refreshSpatialCandidates(sess)
    if (sess.spatialIndex < 0 && sess.spatialPaths.length > 0) {
      initSpatialSelection(sess, sess.x, sess.y)
      return
    }
    const candidates = spatialCandidatesFromSession(sess)
    const nextIndex = navSpatialMoveIndex(candidates, sess.spatialIndex, dx, dy)
    if (nextIndex === sess.spatialIndex) {
      return
    }
    applySpatialIndex(sess, nextIndex)
  }

  function clickSelectedSpatial(sess: NavSession): {
    editableFocused: boolean
    typingMultiline?: boolean
    initialValue?: string
  } {
    const el = resolveNavSpatialElement(sess.selectedPath)
    if (!el) {
      return clickAt(sess.x, sess.y)
    }
    if (isNavLinkTarget(el)) {
      const path = sess.selectedPath
      if (path != null && activateNavLinkAtPath(path)) {
        endTypingUi(sess)
        return { editableFocused: false }
      }
    }
    const editable = resolveEditable(el)
    if (editable) {
      scrollNavSpatialTargetIntoView(editable)
      focusEditableAt(editable, sess.x, sess.y)
      const info = beginTypingUi(sess, editable)
      editable.blur()
      return {
        editableFocused: true,
        typingMultiline: info.typingMultiline,
        initialValue: info.initialValue
      }
    }
    scrollNavSpatialTargetIntoView(el)
    navSpatialClickElement(el)
    endTypingUi(sess)
    return { editableFocused: false }
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
    root.appendChild(createPointerSvgElement())

    const mount = document.body || document.documentElement
    mount.appendChild(root)
    sessionWin().bmxtNav = {
      x: cx,
      y: cy,
      root,
      typingEl: null,
      typingSnapshot: null,
      typingMultiline: false,
      typingActive: false,
      menuOpen: false,
      menuIndex: 0,
      menuVariant: "default",
      textSelPhase: "idle",
      textSelStartX: 0,
      textSelStartY: 0,
      labels: parsedLabels,
      spatialPaths: [],
      spatialBoxes: [],
      spatialIndex: -1,
      selectedPath: null
    }
    if (prevTyping) {
      prevTyping.blur()
    }
    initSpatialSelection(sessionWin().bmxtNav!, cx, cy)
    return navOk(sessionWin().bmxtNav!, { menuOpen: false })
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

  function clickAt(cx: number, cy: number): {
    editableFocused: boolean
    typingMultiline?: boolean
    initialValue?: string
  } {
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
    const sess = sessionWin().bmxtNav
    if (focusTarget && sess) {
      const info = beginTypingUi(sess, focusTarget)
      focusTarget.blur()
      return {
        editableFocused: true,
        typingMultiline: info.typingMultiline,
        initialValue: info.initialValue
      }
    }
    if (sess) {
      endTypingUi(sess)
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
    const activeSess = getSession()
    if (activeSess) {
      activeSess.labels = parsedLabels
    }

    if (action === "stop") {
      removeSession()
      return { ok: true, x: 0, y: 0 }
    }

    if (action === "clearTyping") {
      const sess = sessionWin().bmxtNav
      if (sess) {
        endTypingUi(sess)
      }
      return { ok: true, x: sess?.x ?? 0, y: sess?.y ?? 0 }
    }

    if (action === "revertTyping") {
      const sess = sessionWin().bmxtNav
      if (!sess) {
        return { ok: false, reason: "no-session" }
      }
      const target = typingTarget(sess)
      const snap = sess.typingSnapshot
      if (!target || snap === null) {
        endTypingUi(sess)
        return { ok: false, reason: "no-typing-target" }
      }
      if (!writeEditableValue(target, snap)) {
        return { ok: false, reason: "revert-failed" }
      }
      endTypingUi(sess)
      return { ok: true, x: sess.x, y: sess.y }
    }

    if (action === "applyTyping") {
      const sess = sessionWin().bmxtNav
      if (!sess) {
        return { ok: false, reason: "no-session" }
      }
      const target = typingTarget(sess)
      if (!target) {
        endTypingUi(sess)
        return { ok: false, reason: "no-typing-target" }
      }
      if (!writeEditableValue(target, text)) {
        return { ok: false, reason: "apply-failed" }
      }
      endTypingUi(sess)
      return { ok: true, x: sess.x, y: sess.y, editableFocused: false }
    }

    if (action === "start") {
      if (useCenter === 1 || x < 0 || y < 0) {
        const c = viewportCenter()
        return installAt(c.x, c.y)
      }
      return installAt(x, y)
    }

    let sess = getSession()
    if (!sess) {
      const c = viewportCenter()
      return installAt(c.x, c.y)
    }

    if (action === "move") {
      if (!sess.typingActive) {
        sess.typingEl = null
      }
      spatialMoveSelection(sess, dx, dy)
      if (sess.textSelPhase === "end") {
        previewTextSelection(sess)
      }
      return navOk(sess)
    }

    if (action === "toggleMenu") {
      if (sess.menuOpen) {
        closeMenu(sess)
      } else {
        openMenu(sess)
      }
      return navOk(sess)
    }

    if (action === "textSelMark") {
      if (sess.textSelPhase !== "start" && sess.textSelPhase !== "end") {
        return { ok: false, reason: "text-sel-inactive" }
      }
      markTextSelPoint(sess)
      return navOk(sess)
    }

    if (action === "textSelCancel") {
      cancelTextSelect(sess)
      return navOk(sess, { menuOpen: false })
    }

    if (action === "menuInput") {
      const input = text
      if (input === "close") {
        closeMenu(sess)
        return navOk(sess, { menuOpen: sess.menuOpen })
      }
      if (!sess.menuOpen) {
        return { ok: false, reason: "menu-closed" }
      }
      const items = activeMenuItemIds(sess)
      if (input === "up") {
        sess.menuIndex = (sess.menuIndex - 1 + items.length) % items.length
        renderOverlayRoot(sess)
        return navOk(sess, { menuOpen: true })
      }
      if (input === "down") {
        sess.menuIndex = (sess.menuIndex + 1) % items.length
        renderOverlayRoot(sess)
        return navOk(sess, { menuOpen: true })
      }
      if (input === "left" && sess.menuVariant === "default") {
        window.history.back()
        return navOk(sess, { menuOpen: true })
      }
      if (input === "right" && sess.menuVariant === "default") {
        window.history.forward()
        return navOk(sess, { menuOpen: true })
      }
      if (input === "activate") {
        const itemId = items[sess.menuIndex]
        let navCopiedText: string | undefined
        if (itemId) {
          const outcome = runMenuAction(sess, itemId)
          navCopiedText = outcome.navCopiedText
          if (outcome.disposition === "keepOpen") {
            return navOk(sess, { menuOpen: sess.menuOpen })
          }
        }
        if (sess.menuOpen) {
          closeMenu(sess)
        }
        return navOk(sess, { menuOpen: sess.menuOpen, navCopiedText })
      }
      return { ok: false, reason: "unknown-menu-input" }
    }

    if (action === "click") {
      const clickRes = clickSelectedSpatial(sess)
      return {
        ok: true,
        x: sess.x,
        y: sess.y,
        editableFocused: clickRes.editableFocused,
        typingMultiline: clickRes.typingMultiline,
        initialValue: clickRes.initialValue
      }
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
