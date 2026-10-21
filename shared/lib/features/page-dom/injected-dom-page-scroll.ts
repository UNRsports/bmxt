/**
 * EN: Injected — scroll the page vertically by `deltaY` pixels.
 * JA: ページを縦方向に deltaY ピクセルスクロールする（注入専用）。
 */

export function bmxtDomPageScrollInjected(deltaY: number): { ok: boolean } {
  const step = Number.isFinite(deltaY) ? deltaY : 0
  if (step === 0) {
    return { ok: false }
  }
  try {
    window.scrollBy({ top: step, left: 0, behavior: "auto" })
  } catch {
    window.scrollBy(0, step)
  }
  return { ok: true }
}
