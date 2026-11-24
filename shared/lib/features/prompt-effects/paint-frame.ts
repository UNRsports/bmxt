import { getPromptEffectCanvasContext } from "./canvas-context"
import type { PromptEffectPaintQuality } from "./constants"
import { resolveMenuLitePaintBox } from "./menu-lite-box"
import {
  computePromptParticleBounds,
  quantizePromptEffectBounds
} from "./particle-bounds"
import type { PromptEffectOrigin } from "./types"
import type { PromptEffectTheme } from "./types"
import type { PromptParticle } from "./types"

export { resolveMenuLitePaintBox } from "./menu-lite-box"

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

function particleInsideBox(
  particle: PromptParticle,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
): boolean {
  return particle.x >= minX && particle.x <= maxX && particle.y >= minY && particle.y <= maxY
}

export type PaintPromptEffectFrameOptions = {
  quality: PromptEffectPaintQuality
  /** EN: Required for menuLite fixed box; ignored for full AABB mode. */
  origin?: PromptEffectOrigin | null
}

/**
 * EN: Size canvas to particle AABB (full) or caret box (menuLite), clear, step/paint.
 * JA: full は粒子 AABB、menuLite はキャレット固定箱に Canvas を合わせ、step／描画する。
 */
export function paintPromptEffectFrame(
  canvas: HTMLCanvasElement,
  theme: PromptEffectTheme,
  particles: PromptParticle[],
  options: PaintPromptEffectFrameOptions
): PromptParticle[] {
  const quality = options.quality
  if (particles.length === 0) {
    clearPromptEffectCanvasHost(canvas)
    return particles
  }

  const { cssW, cssH } = resolveStageCssSize()
  let minX: number
  let minY: number
  let maxX: number
  let maxY: number

  if (quality === "menuLite") {
    const origin = options.origin
    if (!origin) {
      clearPromptEffectCanvasHost(canvas)
      return particles
    }
    const box = resolveMenuLitePaintBox(origin, cssW, cssH)
    minX = box.minX
    minY = box.minY
    maxX = box.maxX
    maxY = box.maxY
  } else {
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
    minX = bounds.minX
    minY = bounds.minY
    maxX = bounds.maxX
    maxY = bounds.maxY
  }

  const boxW = Math.max(1, Math.floor(maxX - minX))
  const boxH = Math.max(1, Math.floor(maxY - minY))
  const dpr =
    quality === "menuLite" ? 1 : Math.min(window.devicePixelRatio || 1, 2)
  const pixelW = Math.max(1, Math.floor(boxW * dpr))
  const pixelH = Math.max(1, Math.floor(boxH * dpr))

  if (canvas.width !== pixelW || canvas.height !== pixelH) {
    canvas.width = pixelW
    canvas.height = pixelH
  }
  canvas.style.left = `${minX}px`
  canvas.style.top = `${minY}px`
  canvas.style.width = `${boxW}px`
  canvas.style.height = `${boxH}px`

  const ctx = getPromptEffectCanvasContext(canvas)
  if (!ctx) {
    return particles
  }

  ctx.setTransform(dpr, 0, 0, dpr, -minX * dpr, -minY * dpr)
  ctx.clearRect(minX, minY, boxW, boxH)
  ctx.globalCompositeOperation = quality === "menuLite" ? "source-over" : "lighter"

  const next: PromptParticle[] = []
  for (const particle of particles) {
    if (quality === "menuLite" && !particleInsideBox(particle, minX, minY, maxX, maxY)) {
      continue
    }
    const alive = theme.stepAndPaint(ctx, particle, quality)
    if (alive) {
      if (quality === "menuLite" && !particleInsideBox(particle, minX, minY, maxX, maxY)) {
        continue
      }
      next.push(particle)
    }
  }
  ctx.globalCompositeOperation = "source-over"

  if (next.length === 0) {
    clearPromptEffectCanvasHost(canvas)
  }
  return next
}
