import { getPromptEffectCanvasContext } from "./canvas-context"
import {
  computePromptParticleBounds,
  quantizePromptEffectBounds
} from "./particle-bounds"
import type { PromptEffectTheme } from "./types"
import type { PromptParticle } from "./types"

/** EN: CSS pixel size of the full-window effect stage. */
function resolveStageCssSize(): { cssW: number; cssH: number } {
  const vv = window.visualViewport
  const cssW = Math.max(1, Math.floor(vv?.width ?? window.innerWidth))
  const cssH = Math.max(1, Math.floor(vv?.height ?? window.innerHeight))
  return { cssW, cssH }
}

/** EN: Collapse the canvas element so an empty buffer does not cover the viewport. */
function clearPromptEffectCanvasHost(canvas: HTMLCanvasElement): void {
  if (canvas.width !== 0 || canvas.height !== 0) {
    canvas.width = 0
    canvas.height = 0
  }
  canvas.style.left = "0px"
  canvas.style.top = "0px"
  canvas.style.width = "0px"
  canvas.style.height = "0px"
}

/**
 * EN: Size canvas to the particle AABB (not the full viewport), clear, step/paint.
 * JA: 粒子 AABB に Canvas を合わせ（全画面ではない）、クリア後に step／描画する。
 */
export function paintPromptEffectFrame(
  canvas: HTMLCanvasElement,
  theme: PromptEffectTheme,
  particles: PromptParticle[]
): PromptParticle[] {
  if (particles.length === 0) {
    clearPromptEffectCanvasHost(canvas)
    return particles
  }

  const { cssW, cssH } = resolveStageCssSize()
  const rawBounds = computePromptParticleBounds(particles)
  if (!rawBounds) {
    clearPromptEffectCanvasHost(canvas)
    return []
  }
  const bounds = quantizePromptEffectBounds(rawBounds, cssW, cssH)
  if (!bounds) {
    clearPromptEffectCanvasHost(canvas)
    return particles
  }

  const boxW = Math.max(1, Math.floor(bounds.maxX - bounds.minX))
  const boxH = Math.max(1, Math.floor(bounds.maxY - bounds.minY))
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const pixelW = Math.max(1, Math.floor(boxW * dpr))
  const pixelH = Math.max(1, Math.floor(boxH * dpr))

  if (canvas.width !== pixelW || canvas.height !== pixelH) {
    canvas.width = pixelW
    canvas.height = pixelH
  }
  canvas.style.left = `${bounds.minX}px`
  canvas.style.top = `${bounds.minY}px`
  canvas.style.width = `${boxW}px`
  canvas.style.height = `${boxH}px`

  const ctx = getPromptEffectCanvasContext(canvas)
  if (!ctx) {
    return particles
  }

  // EN: Map viewport CSS coords into the AABB-sized backing store.
  ctx.setTransform(dpr, 0, 0, dpr, -bounds.minX * dpr, -bounds.minY * dpr)
  ctx.clearRect(bounds.minX, bounds.minY, boxW, boxH)
  ctx.globalCompositeOperation = "lighter"

  const next: PromptParticle[] = []
  for (const particle of particles) {
    const alive = theme.stepAndPaint(ctx, particle)
    if (alive) {
      next.push(particle)
    }
  }
  ctx.globalCompositeOperation = "source-over"

  if (next.length === 0) {
    clearPromptEffectCanvasHost(canvas)
  }
  return next
}
