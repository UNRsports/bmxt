import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  DEFAULT_BMXT_NEEDLE_HIGHLIGHT_COLORS
} from "./injected-needle-highlight.ts"
import { resolveNeedleHighlightColors } from "./page-scroll-needle-message.ts"

describe("resolveNeedleHighlightColors", () => {
  it("returns defaults when colors are omitted", () => {
    assert.deepEqual(resolveNeedleHighlightColors(), DEFAULT_BMXT_NEEDLE_HIGHLIGHT_COLORS)
  })

  it("accepts valid hex colors", () => {
    assert.deepEqual(
      resolveNeedleHighlightColors({
        hitBg: "#ffc9dd",
        jumpBg: "#ffdb4d",
        fg: "#0d1117"
      }),
      {
        hitBg: "#ffc9dd",
        jumpBg: "#ffdb4d",
        fg: "#0d1117"
      }
    )
  })

  it("rejects CSS injection payloads", () => {
    const resolved = resolveNeedleHighlightColors({
      hitBg: '#fff;}body{background:url(//evil)}/*',
      jumpBg: "red",
      fg: "#0d1117"
    })
    assert.equal(resolved.hitBg, DEFAULT_BMXT_NEEDLE_HIGHLIGHT_COLORS.hitBg)
    assert.equal(resolved.jumpBg, DEFAULT_BMXT_NEEDLE_HIGHLIGHT_COLORS.jumpBg)
    assert.equal(resolved.fg, "#0d1117")
  })
})
