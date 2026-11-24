import type { PromptEffectTheme } from "./types"
import type { PromptParticle } from "./types"

/** EN: Resize canvas to the host, clear, and step/paint all particles via the theme. */
export function paintPromptEffectFrame(
  canvas: HTMLCanvasElement,
  host: HTMLElement,
  theme: PromptEffectTheme,
  particles: PromptParticle[]
): PromptParticle[] {
  const cssW = Math.max(1, Math.floor(host.clientWidth))
  const cssH = Math.max(1, Math.floor(host.clientHeight))
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
