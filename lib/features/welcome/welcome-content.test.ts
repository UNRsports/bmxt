import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  WELCOME_NONE_HERO_IMAGE,
  isRenderableWelcomeImagePath,
  listWelcomeImagePaths,
  resolveHeroImageMaxWidthCss
} from "./welcome-image-paths.ts"

describe("welcome-content images", () => {
  it("isRenderableWelcomeImagePath rejects sentinels", () => {
    assert.equal(isRenderableWelcomeImagePath(undefined), false)
    assert.equal(isRenderableWelcomeImagePath(""), false)
    assert.equal(isRenderableWelcomeImagePath(WELCOME_NONE_HERO_IMAGE), false)
    assert.equal(isRenderableWelcomeImagePath("_none_extra.png"), false)
    assert.equal(isRenderableWelcomeImagePath("assets/welcome/hero.png"), true)
  })

  it("listWelcomeImagePaths omits _none_heroImage", () => {
    assert.deepEqual(
      listWelcomeImagePaths({
        heroImage: WELCOME_NONE_HERO_IMAGE,
        additionalImages: [],
        ja: [],
        en: []
      }),
      []
    )
    assert.deepEqual(
      listWelcomeImagePaths({
        heroImage: "assets/welcome/a.png",
        additionalImages: ["_none_skip.png", "assets/welcome/b.png"],
        ja: [],
        en: []
      }),
      ["assets/welcome/a.png", "assets/welcome/b.png"]
    )
  })

  it("resolveHeroImageMaxWidthCss normalizes numbers and unit strings", () => {
    assert.equal(resolveHeroImageMaxWidthCss(undefined), undefined)
    assert.equal(resolveHeroImageMaxWidthCss(840), "840px")
    assert.equal(resolveHeroImageMaxWidthCss("720"), "720px")
    assert.equal(resolveHeroImageMaxWidthCss("80%"), "80%")
    assert.equal(resolveHeroImageMaxWidthCss("640px"), "640px")
    assert.equal(resolveHeroImageMaxWidthCss(0), undefined)
    assert.equal(resolveHeroImageMaxWidthCss("not-a-size"), undefined)
  })
})
