import type { PromptParticle } from "../../types"
import { fireHeatColor, fireShatterColor } from "./colors"

/**
 * EN: Step physics and paint one fire-theme particle. False when expired.
 * JA: fire テーマ粒子の物理更新と描画。寿命切れなら false。
 */
export function stepAndPaintFireParticle(
  ctx: CanvasRenderingContext2D,
  particle: PromptParticle
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
    const grad = ctx.createRadialGradient(
      particle.x,
      particle.y,
      0,
      particle.x,
      particle.y,
      radius
    )
    grad.addColorStop(0, fireHeatColor(particle.heat, alpha))
    grad.addColorStop(0.45, fireHeatColor(particle.heat * 0.75, alpha * 0.55))
    grad.addColorStop(1, fireHeatColor(particle.heat * 0.35, 0))
    ctx.fillStyle = grad
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
  ctx.fillStyle = core
  ctx.beginPath()
  ctx.arc(0, 0, Math.max(0.6, radius * 0.35), 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  return true
}
