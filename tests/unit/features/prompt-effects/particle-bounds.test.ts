import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  computePromptParticleBounds,
  promptParticlePaintRadius,
  quantizePromptEffectBounds,
  PROMPT_EFFECT_BOUNDS_PAD_PX,
  PROMPT_EFFECT_BOUNDS_QUANT_PX
} from "../../../../shared/lib/features/prompt-effects/particle-bounds.ts"
import type { PromptParticle } from "../../../../shared/lib/features/prompt-effects/types.ts"

function sampleParticle(partial: Partial<PromptParticle>): PromptParticle {
  return {
    themeId: "fire",
    variant: "flame",
    x: 100,
    y: 200,
    vx: 0,
    vy: 0,
    life: 40,
    maxLife: 40,
    size: 4,
    heat: 0.8,
    spin: 0,
    ...partial
  }
}

describe("prompt-effects particle-bounds", () => {
  it("returns null for an empty particle list", () => {
    assert.equal(computePromptParticleBounds([]), null)
  })

  it("unions particles with pad and motion slack", () => {
    const a = sampleParticle({ x: 100, y: 100, size: 4, vx: 0, vy: 0 })
    const b = sampleParticle({ x: 140, y: 100, size: 4, vx: 0, vy: 0 })
    const bounds = computePromptParticleBounds([a, b])
    assert.ok(bounds)
    const radiusA = promptParticlePaintRadius(a)
    const radiusB = promptParticlePaintRadius(b)
    assert.equal(bounds.minX, 100 - radiusA - PROMPT_EFFECT_BOUNDS_PAD_PX)
    assert.equal(bounds.minY, 100 - radiusA - PROMPT_EFFECT_BOUNDS_PAD_PX)
    assert.equal(bounds.maxX, 140 + radiusB + PROMPT_EFFECT_BOUNDS_PAD_PX)
    assert.equal(bounds.maxY, 100 + radiusB + PROMPT_EFFECT_BOUNDS_PAD_PX)
  })

  it("quantizes and clips to the stage", () => {
    const quant = PROMPT_EFFECT_BOUNDS_QUANT_PX
    const q = quantizePromptEffectBounds(
      { minX: 10, minY: 10, maxX: 50, maxY: 50 },
      200,
      200,
      quant
    )
    assert.ok(q)
    assert.equal(q.minX % quant, 0)
    assert.equal(q.minY % quant, 0)
    assert.ok(q.maxX <= 200)
    assert.ok(q.maxY <= 200)
  })

  it("returns null when bounds lie entirely outside the stage", () => {
    assert.equal(
      quantizePromptEffectBounds({ minX: -80, minY: -80, maxX: -10, maxY: -10 }, 100, 100),
      null
    )
  })
})
