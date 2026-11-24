import { pushParticle } from "../../particle-buffer"
import type { PromptEffectOrigin, PromptParticle } from "../../types"
import { FIRE_THEME_ID } from "./theme-id"

const FIRE_BURST_COUNT = 18
const SHATTER_BURST_COUNT = 22

/** EN: Upward flame burst for newly typed characters. */
export function spawnFireTypeBurst(
  out: PromptParticle[],
  origin: PromptEffectOrigin
): void {
  for (let i = 0; i < FIRE_BURST_COUNT; i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.1
    const speed = 0.35 + Math.random() * 1.6
    const maxLife = 28 + Math.random() * 34
    pushParticle(out, {
      themeId: FIRE_THEME_ID,
      variant: "flame",
      x: origin.x + (Math.random() - 0.5) * 8,
      y: origin.y + (Math.random() - 0.5) * 4,
      vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 0.4,
      vy: Math.sin(angle) * speed - 0.4 - Math.random() * 0.8,
      life: maxLife,
      maxLife,
      size: 2.2 + Math.random() * 3.8,
      heat: 0.55 + Math.random() * 0.45,
      spin: 0
    })
  }
}

/** EN: Radial glitter shards for deleted characters. */
export function spawnFireDeleteBurst(
  out: PromptParticle[],
  origin: PromptEffectOrigin,
  removedCount: number
): void {
  const count = Math.min(SHATTER_BURST_COUNT + Math.max(0, removedCount - 1) * 4, 40)
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 0.9 + Math.random() * 2.8
    const maxLife = 22 + Math.random() * 28
    pushParticle(out, {
      themeId: FIRE_THEME_ID,
      variant: "shatter",
      x: origin.x + (Math.random() - 0.5) * 6,
      y: origin.y + (Math.random() - 0.5) * 6,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 0.2,
      life: maxLife,
      maxLife,
      size: 1.2 + Math.random() * 2.6,
      heat: Math.random(),
      spin: (Math.random() - 0.5) * 0.45
    })
  }
}
