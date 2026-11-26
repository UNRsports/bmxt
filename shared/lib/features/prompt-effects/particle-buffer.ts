import {
  PROMPT_EFFECT_MAX_PARTICLES,
  PROMPT_EFFECT_MENU_LITE_MAX_PARTICLES,
  type PromptEffectPaintQuality
} from "./constants.ts"
import type { PromptParticle } from "./types.ts"

/** EN: Soft cap for the active paint quality. */
export function promptEffectParticleCap(quality: PromptEffectPaintQuality): number {
  if (quality === "menuLite") {
    return PROMPT_EFFECT_MENU_LITE_MAX_PARTICLES
  }
  return PROMPT_EFFECT_MAX_PARTICLES
}

/** EN: Append a particle, dropping the oldest when over the soft cap. */
export function pushParticle(
  particles: PromptParticle[],
  particle: PromptParticle,
  quality: PromptEffectPaintQuality = "full"
): void {
  const cap = promptEffectParticleCap(quality)
  while (particles.length >= cap) {
    particles.shift()
  }
  particles.push(particle)
}

/** EN: Drop oldest particles until at or under the quality cap (e.g. menu just opened). */
export function trimParticlesToQuality(
  particles: PromptParticle[],
  quality: PromptEffectPaintQuality
): void {
  const cap = promptEffectParticleCap(quality)
  while (particles.length > cap) {
    particles.shift()
  }
}
