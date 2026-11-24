import { PROMPT_EFFECT_MAX_PARTICLES } from "./constants"
import type { PromptParticle } from "./types"

/** EN: Append a particle, dropping the oldest when over the soft cap. */
export function pushParticle(particles: PromptParticle[], particle: PromptParticle): void {
  if (particles.length >= PROMPT_EFFECT_MAX_PARTICLES) {
    particles.shift()
  }
  particles.push(particle)
}
