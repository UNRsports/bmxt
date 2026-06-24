import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import {
  WELCOME_NONE_HERO_IMAGE,
  isRenderableWelcomeImagePath,
  listWelcomeImagePaths,
  resolveHeroImageMaxWidthCss
} from "./welcome-image-paths.ts"

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..")
const docsRoot = join(root, "docs")
const jsonPath = join(docsRoot, "welcome-content.json")

type WelcomeContentEntry = {
  version: string
  heroImage?: string
  heroImageMaxWidth?: number | string
  additionalImages?: string[]
  en: string[]
  ja: string[]
}

function compareVersion(a: string, b: string): number {
  const pa = a.split(".").map((n) => Number(n))
  const pb = b.split(".").map((n) => Number(n))
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const da = pa[i] ?? 0
    const db = pb[i] ?? 0
    if (da !== db) {
      return da - db
    }
  }
  return 0
}

describe("welcome-content images", () => {
  it("isRenderableWelcomeImagePath rejects sentinels", () => {
    assert.equal(isRenderableWelcomeImagePath(undefined), false)
    assert.equal(isRenderableWelcomeImagePath(""), false)
    assert.equal(isRenderableWelcomeImagePath(WELCOME_NONE_HERO_IMAGE), false)
    assert.equal(isRenderableWelcomeImagePath("_none_extra.png"), false)
    assert.equal(isRenderableWelcomeImagePath("welcome/hero.png"), true)
  })

  it("listWelcomeImagePaths omits _none_heroImage", () => {
    assert.deepEqual(
      listWelcomeImagePaths({
        heroImage: WELCOME_NONE_HERO_IMAGE,
        additionalImages: []
      }),
      []
    )
    assert.deepEqual(
      listWelcomeImagePaths({
        heroImage: "welcome/a.png",
        additionalImages: ["_none_skip.png", "welcome/b.png"]
      }),
      ["welcome/a.png", "welcome/b.png"]
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

describe("welcome-content.json", () => {
  const raw = readFileSync(jsonPath, "utf8")
  const entries = JSON.parse(raw) as WelcomeContentEntry[]

  it("is a non-empty array with version, en, ja on each entry", () => {
    assert.ok(Array.isArray(entries))
    assert.ok(entries.length > 0)
    for (const entry of entries) {
      assert.match(entry.version, /^\d+(\.\d+)*$/)
      assert.ok(Array.isArray(entry.en) && entry.en.length > 0)
      assert.ok(Array.isArray(entry.ja) && entry.ja.length > 0)
    }
  })

  it("lists newer versions before older ones (append new entries at the top)", () => {
    for (let i = 0; i < entries.length - 1; i++) {
      assert.ok(
        compareVersion(entries[i].version, entries[i + 1].version) >= 0,
        `expected ${entries[i].version} >= ${entries[i + 1].version}`
      )
    }
  })

  it("references welcome assets under docs/", () => {
    for (const entry of entries) {
      for (const path of listWelcomeImagePaths(entry)) {
        assert.match(path, /^welcome\/[\w.-]+$/)
        const assetPath = join(docsRoot, path)
        assert.ok(
          existsSync(assetPath),
          `missing asset for ${entry.version}: ${path} → ${assetPath}`
        )
      }
    }
  })
})
