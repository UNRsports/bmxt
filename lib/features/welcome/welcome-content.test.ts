import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  WELCOME_NONE_HERO_IMAGE,
  isRenderableWelcomeImagePath,
  listWelcomeImagePaths
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
})
