import type { PromptParticle } from "./types"

/** EN: Axis-aligned paint box in CSS viewport pixels. */
export type PromptEffectPaintBounds = {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/** EN: Extra CSS px so one physics step + soft edge cannot clip. */
export const PROMPT_EFFECT_BOUNDS_PAD_PX = 28

/** EN: Snap bounds to this grid to avoid per-frame canvas realloc thrash. */
export const PROMPT_EFFECT_BOUNDS_QUANT_PX = 32

/**
 * EN: Visual radius budget for AABB (flame/shatter draw scale + motion slack).
 * JA: AABB 用の描画半径予算（炎／破片の拡大幅＋1 フレーム分の移動）。
 */
export function promptParticlePaintRadius(particle: PromptParticle): number {
  const drawScale = particle.size * 1.7
  const motion = Math.abs(particle.vx) + Math.abs(particle.vy) + 4
  return drawScale + motion
}

/**
 * EN: Union AABB of live particles in viewport CSS space, or null when empty.
 * JA: 生存粒子のビューポート CSS 空間での AABB。空なら null。
 */
export function computePromptParticleBounds(
  particles: readonly PromptParticle[],
  padPx: number = PROMPT_EFFECT_BOUNDS_PAD_PX
): PromptEffectPaintBounds | null {
  if (particles.length === 0) {
    return null
  }
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  for (const particle of particles) {
    const radius = promptParticlePaintRadius(particle)
    const left = particle.x - radius
    const top = particle.y - radius
    const right = particle.x + radius
    const bottom = particle.y + radius
    if (left < minX) {
      minX = left
    }
    if (top < minY) {
      minY = top
    }
    if (right > maxX) {
      maxX = right
    }
    if (bottom > maxY) {
      maxY = bottom
    }
  }
  return {
    minX: minX - padPx,
    minY: minY - padPx,
    maxX: maxX + padPx,
    maxY: maxY + padPx
  }
}

/**
 * EN: Quantize and clip bounds to the stage so canvas size stays stable and on-screen.
 * JA: ステージ内にクリップしつつ量子化し、Canvas サイズのちらつきを抑える。
 */
export function quantizePromptEffectBounds(
  bounds: PromptEffectPaintBounds,
  stageW: number,
  stageH: number,
  quantPx: number = PROMPT_EFFECT_BOUNDS_QUANT_PX
): PromptEffectPaintBounds | null {
  const quant = Math.max(1, Math.floor(quantPx))
  const rawMinX = Math.max(0, bounds.minX)
  const rawMinY = Math.max(0, bounds.minY)
  const rawMaxX = Math.min(stageW, bounds.maxX)
  const rawMaxY = Math.min(stageH, bounds.maxY)
  if (rawMaxX <= rawMinX || rawMaxY <= rawMinY) {
    return null
  }
  const minX = Math.floor(rawMinX / quant) * quant
  const minY = Math.floor(rawMinY / quant) * quant
  const maxX = Math.min(stageW, Math.ceil(rawMaxX / quant) * quant)
  const maxY = Math.min(stageH, Math.ceil(rawMaxY / quant) * quant)
  if (maxX <= minX || maxY <= minY) {
    return null
  }
  return { minX, minY, maxX, maxY }
}
