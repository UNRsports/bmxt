/**
 * EN: Classified activate for nav targets (prefer one click(); pointer cascade only as fallback).
 * JA: 分類別 activate（優先は click() 1 回。ポインタ連鎖はフォールバックのみ）。
 */

import type { NavTargetKind } from "./nav-target-classify.ts"

export type NavActivateOutcome = {
  ok: boolean
  reason?: "inert" | "missing" | "click-failed" | "pointer-failed"
}

function dispatchPointerClick(el: Element, clientX: number, clientY: number): void {
  const htmlEl = el as HTMLElement
  if (typeof MouseEvent !== "function") {
    return
  }
  const opts: MouseEventInit = {
    bubbles: true,
    cancelable: true,
    view: globalThis.window ?? undefined,
    clientX,
    clientY,
    button: 0
  }
  htmlEl.dispatchEvent(new MouseEvent("pointerdown", opts))
  htmlEl.dispatchEvent(new MouseEvent("mousedown", opts))
  htmlEl.dispatchEvent(new MouseEvent("pointerup", opts))
  htmlEl.dispatchEvent(new MouseEvent("mouseup", opts))
  htmlEl.dispatchEvent(new MouseEvent("click", opts))
}

/** EN: Single activation — `click()` only (no synthetic MouseEvent storm). */
export function navActivateClickOnce(el: Element): NavActivateOutcome {
  const htmlEl = el as HTMLElement
  if (typeof htmlEl.click !== "function") {
    return { ok: false, reason: "click-failed" }
  }
  try {
    htmlEl.click()
    return { ok: true }
  } catch {
    return { ok: false, reason: "click-failed" }
  }
}

/** EN: Center-point pointer cascade without a second `click()` call. */
export function navActivatePointerAtCenter(el: Element): NavActivateOutcome {
  const htmlEl = el as HTMLElement
  const rect = htmlEl.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  try {
    dispatchPointerClick(el, cx, cy)
    return { ok: true }
  } catch {
    return { ok: false, reason: "pointer-failed" }
  }
}

/**
 * EN: Activate by kind. link / button-like / media → click once;
 *     maybe-interactive → pointer at center; inert → fail.
 */
export function activateNavTargetByKind(el: Element, kind: NavTargetKind): NavActivateOutcome {
  if (kind === "inert") {
    return { ok: false, reason: "inert" }
  }
  if (kind === "editable") {
    return { ok: true }
  }
  if (kind === "maybe-interactive") {
    const pointer = navActivatePointerAtCenter(el)
    if (pointer.ok) {
      return pointer
    }
    return navActivateClickOnce(el)
  }
  const once = navActivateClickOnce(el)
  if (once.ok) {
    return once
  }
  return navActivatePointerAtCenter(el)
}
