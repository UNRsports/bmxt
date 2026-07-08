import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { sanitizeBundleBgImageFileName } from "./sanitize-bundle-bg-image-file-name.ts"

describe("sanitizeBundleBgImageFileName", () => {
  it("accepts simple bundle file names", () => {
    assert.equal(sanitizeBundleBgImageFileName("background-image.png"), "background-image.png")
  })

  it("rejects path traversal and separators", () => {
    assert.equal(sanitizeBundleBgImageFileName("../background-image.png"), null)
    assert.equal(sanitizeBundleBgImageFileName("images/background-image.png"), null)
    assert.equal(sanitizeBundleBgImageFileName("..\\background-image.png"), null)
  })

  it("rejects empty and invalid characters", () => {
    assert.equal(sanitizeBundleBgImageFileName(""), null)
    assert.equal(sanitizeBundleBgImageFileName("bad name.png"), null)
  })
})
