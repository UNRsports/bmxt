import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  PROMPT_EFFECT_MENU_LITE_BOX_H,
  PROMPT_EFFECT_MENU_LITE_BOX_W,
  PROMPT_EFFECT_MENU_LITE_MAX_PARTICLES
} from "../../../../shared/lib/features/prompt-effects/constants.ts"
import { resolveMenuLitePaintBox } from "../../../../shared/lib/features/prompt-effects/menu-lite-box.ts"
import {
  promptEffectParticleCap,
  trimParticlesToQuality
} from "../../../../shared/lib/features/prompt-effects/particle-buffer.ts"
import type { PromptParticle } from "../../../../shared/lib/features/prompt-effects/types.ts"

function sampleParticle(partial: Partial<PromptParticle> = {}): PromptParticle {
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

describe("prompt-effects menu-lite", () => {
  it("uses a hard particle cap in menuLite", () => {
    assert.equal(promptEffectParticleCap("menuLite"), PROMPT_EFFECT_MENU_LITE_MAX_PARTICLES)
    assert.ok(promptEffectParticleCap("full") > PROMPT_EFFECT_MENU_LITE_MAX_PARTICLES)
  })

  it("trims excess particles when entering menuLite", () => {
    const particles = Array.from({ length: 40 }, (_, i) => sampleParticle({ x: i }))
    trimParticlesToQuality(particles, "menuLite")
    assert.equal(particles.length, PROMPT_EFFECT_MENU_LITE_MAX_PARTICLES)
  })

  it("anchors a fixed caret-local paint box inside the stage", () => {
    const box = resolveMenuLitePaintBox({ x: 400, y: 500 }, 800, 600)
    assert.equal(box.maxX - box.minX, PROMPT_EFFECT_MENU_LITE_BOX_W)
    assert.equal(box.maxY - box.minY, PROMPT_EFFECT_MENU_LITE_BOX_H)
    assert.ok(box.minX >= 0)
    assert.ok(box.minY >= 0)
    assert.ok(box.maxX <= 800)
    assert.ok(box.maxY <= 600)
  })

  it("clamps the lite box to the top-left when the caret is near the origin", () => {
    const box = resolveMenuLitePaintBox({ x: 4, y: 4 }, 800, 600)
    assert.equal(box.minX, 0)
    assert.equal(box.minY, 0)
    assert.equal(box.maxX, PROMPT_EFFECT_MENU_LITE_BOX_W)
    assert.equal(box.maxY, PROMPT_EFFECT_MENU_LITE_BOX_H)
  })
})
