/**
 * EN: Cache 2d context per canvas — getContext every rAF is avoidable work on Gecko.
 * JA: Canvas ごとの 2d コンテキストをキャッシュ（毎 rAF の getContext を Gecko で避ける）。
 */

const contextByCanvas = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>()

/** EN: Return a 2d context for the canvas, reusing a prior handle when possible. */
export function getPromptEffectCanvasContext(
  canvas: HTMLCanvasElement
): CanvasRenderingContext2D | null {
  const cached = contextByCanvas.get(canvas)
  if (cached) {
    return cached
  }
  const ctx = canvas.getContext("2d")
  if (!ctx) {
    return null
  }
  contextByCanvas.set(canvas, ctx)
  return ctx
}
