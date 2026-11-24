import { pushParticle } from "../../particle-buffer"
import type { PromptEffectOrigin, PromptParticle } from "../../types"
import { FIRE_THEME_ID } from "./theme-id"

const FIRE_BURST_COUNT = 22
const SHATTER_BURST_COUNT = 28

/** EN: Upward flame burst for newly typed characters (rises across several prompt lines). */
export function spawnFireTypeBurst(
  out: PromptParticle[],
  origin: PromptEffectOrigin
): void {
  for (let i = 0; i < FIRE_BURST_COUNT; i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.85
    const speed = 1.4 + Math.random() * 3.2
    const maxLife = 52 + Math.random() * 58
    pushParticle(out, {
      themeId: FIRE_THEME_ID,
      variant: "flame",
      x: origin.x + (Math.random() - 0.5) * 10,
      y: origin.y + (Math.random() - 0.5) * 5,
      vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 0.55,
      vy: Math.sin(angle) * speed - 0.9 - Math.random() * 1.4,
      life: maxLife,
      maxLife,
      size: 2.8 + Math.random() * 4.6,
      heat: 0.55 + Math.random() * 0.45,
      spin: 0
    })
  }
}

/** EN: Wide radial glitter shards for deleted characters (scatters across the stage). */
export function spawnFireDeleteBurst(
  out: PromptParticle[],
  origin: PromptEffectOrigin,
  removedCount: number
): void {
  const count = Math.min(SHATTER_BURST_COUNT + Math.max(0, removedCount - 1) * 5, 64)
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 2.2 + Math.random() * 5.2
    const maxLife = 40 + Math.random() * 50
    pushParticle(out, {
      themeId: FIRE_THEME_ID,
      variant: "shatter",
      x: origin.x + (Math.random() - 0.5) * 10,
      y: origin.y + (Math.random() - 0.5) * 10,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 0.35,
      life: maxLife,
      maxLife,
      size: 1.4 + Math.random() * 3.2,
      heat: Math.random(),
      spin: (Math.random() - 0.5) * 0.55
    })
  }
}
