import type { PromptEffectTheme } from "./types"
import type { PromptParticle } from "./types"

/** EN: CSS pixel size of the full-window effect stage. */
function resolveStageCssSize(): { cssW: number; cssH: number } {
  const vv = window.visualViewport
  const cssW = Math.max(1, Math.floor(vv?.width ?? window.innerWidth))
  const cssH = Math.max(1, Math.floor(vv?.height ?? window.innerHeight))
  return { cssW, cssH }
}

/**
 * EN: Resize canvas to the viewport stage, clear, and step/paint all particles via the theme.
 * JA: ビューポート全面に Canvas を合わせ、クリア後にテーマで粒子を step／描画する。
 */
export function paintPromptEffectFrame(
  canvas: HTMLCanvasElement,
  theme: PromptEffectTheme,
  particles: PromptParticle[]
): PromptParticle[] {
  const { cssW, cssH } = resolveStageCssSize()
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const pixelW = Math.floor(cssW * dpr)
  const pixelH = Math.floor(cssH * dpr)
  if (canvas.width !== pixelW || canvas.height !== pixelH) {
    canvas.width = pixelW
    canvas.height = pixelH
    canvas.style.width = `${cssW}px`
    canvas.style.height = `${cssH}px`
  }
  const ctx = canvas.getContext("2d")
  if (!ctx) {
    return particles
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, cssW, cssH)
  ctx.globalCompositeOperation = "lighter"

  const next: PromptParticle[] = []
  for (const particle of particles) {
    const alive = theme.stepAndPaint(ctx, particle)
    if (alive) {
      next.push(particle)
    }
  }
  ctx.globalCompositeOperation = "source-over"
  return next
}
