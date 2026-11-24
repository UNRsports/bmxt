import type { PromptEffectPaintQuality } from "../../constants"
import type { PromptParticle } from "../../types"
import { fireHeatColor, fireShatterColor } from "./colors"

/**
 * EN: Step physics and paint one fire-theme particle. False when expired.
 * JA: fire テーマ粒子の物理更新と描画。寿命切れなら false。
 *
 * Full quality: soft outer + core discs (no createRadialGradient — costly on Gecko).
 * Menu-lite: single disc only.
 */
export function stepAndPaintFireParticle(
  ctx: CanvasRenderingContext2D,
  particle: PromptParticle,
  quality: PromptEffectPaintQuality = "full"
): boolean {
  const lifeRatio = particle.life / particle.maxLife
  particle.x += particle.vx
  particle.y += particle.vy
  particle.life -= 1
  if (particle.life <= 0) {
    return false
  }

  if (particle.variant === "flame") {
    particle.vx += (Math.random() - 0.5) * 0.14
    particle.vy -= 0.06 + Math.random() * 0.08
    const alpha = Math.min(1, lifeRatio * 1.25) * 0.85
    const radius = particle.size * (0.55 + lifeRatio * 0.7)
    if (quality === "menuLite") {
      ctx.fillStyle = fireHeatColor(particle.heat, alpha)
      ctx.beginPath()
      ctx.arc(particle.x, particle.y, radius, 0, Math.PI * 2)
      ctx.fill()
      return true
    }
    // EN: Soft outer glow (cheaper than radial gradient under additive blend).
    ctx.fillStyle = fireHeatColor(particle.heat * 0.55, alpha * 0.28)
    ctx.beginPath()
    ctx.arc(particle.x, particle.y, radius * 1.55, 0, Math.PI * 2)
    ctx.fill()
    // EN: Hot core disc.
    ctx.fillStyle = fireHeatColor(particle.heat, alpha)
    ctx.beginPath()
    ctx.arc(particle.x, particle.y, radius, 0, Math.PI * 2)
    ctx.fill()
    return true
  }

  // EN: Shatter — outward drift with light gravity and twinkle (travels farther on the stage).
  particle.vx *= 0.988
  particle.vy += 0.038
  particle.spin *= 0.98
  const alpha = Math.min(1, lifeRatio * 1.35) * 0.95
  const radius = particle.size * (0.4 + lifeRatio * 0.9)
  const color = fireShatterColor(particle.heat, lifeRatio, alpha)
  const core = fireShatterColor(particle.heat + 0.2, lifeRatio, Math.min(1, alpha * 1.2))

  ctx.save()
  ctx.translate(particle.x, particle.y)
  ctx.rotate(particle.spin * (particle.maxLife - particle.life))
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(0, -radius)
  ctx.lineTo(radius * 0.35, 0)
  ctx.lineTo(0, radius)
  ctx.lineTo(-radius * 0.35, 0)
  ctx.closePath()
  ctx.fill()
  if (quality !== "menuLite") {
    ctx.fillStyle = core
    ctx.beginPath()
    ctx.arc(0, 0, Math.max(0.6, radius * 0.35), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
  return true
}
