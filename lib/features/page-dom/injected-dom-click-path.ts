/**
 * EN: Activate a link at a DOM tree path — run in the content script bundle
 *     (`dom-list-in-page-handler.ts`), not via bare `executeScript({ func })`.
 * JA: path のリンクをクリック相当で起動。常駐 CS バンドル内で実行。
 */

import { resolveNodeFromPath } from "./injected-dom-path.ts"

function resolveLinkClickTarget(el: Element): Element | null {
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
  const closest = el.closest("a[href], area[href], [role='link'], summary")
  return closest
}

function scrollTargetIntoView(target: Element): void {
  const scrollIntoView = (target as HTMLElement).scrollIntoView
  if (typeof scrollIntoView !== "function") {
    return
  }
  try {
    scrollIntoView.call(target, { block: "center", inline: "nearest", behavior: "smooth" })
  } catch {
    scrollIntoView.call(target)
  }
}

function clickElement(el: Element): void {
  const htmlEl = el as HTMLElement
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
  if (typeof htmlEl.click === "function") {
    htmlEl.click()
  }
}

export function bmxtDomClickLinkAtPathInjected(path: number[]): { ok: boolean } {
  const el = resolveNodeFromPath(path)
  if (!el) {
    return { ok: false }
  }
  const target = resolveLinkClickTarget(el)
  if (!target) {
    return { ok: false }
  }
  scrollTargetIntoView(target)
  clickElement(target)
  return { ok: true }
}
