import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  parseNavJumpQueryPayload,
  rankNavJumpMatches,
  serializeNavJumpQueryPayload,
  type NavJumpCandidate
} from "./nav-jump-match.ts"

describe("nav-jump-match", () => {
  const candidates: NavJumpCandidate[] = [
    { index: 0, matchKeys: ["/docs/guide", "guide"], kind: "link", confidence: 0.9 },
    { index: 1, matchKeys: ["save draft", "save"], kind: "button-like", confidence: 0.85 },
    { index: 2, matchKeys: ["company logo"], kind: "media", confidence: 0.8 },
    { index: 3, matchKeys: [], kind: "inert", confidence: 1 }
  ]

  it("ranks prefix matches above substring", () => {
    const r = rankNavJumpMatches(candidates, "save")
    assert.deepEqual(r.rankedIndices, [1])
  })

  it("matches href fragments", () => {
    const r = rankNavJumpMatches(candidates, "docs/gu")
    assert.deepEqual(r.rankedIndices, [0])
  })

  it("returns empty for zero matches", () => {
    const r = rankNavJumpMatches(candidates, "zzzz")
    assert.deepEqual(r.rankedIndices, [])
  })

  it("skips inert even if keys somehow match", () => {
    const withInert: NavJumpCandidate[] = [
      { index: 0, matchKeys: ["hidden"], kind: "inert", confidence: 1 }
    ]
    assert.deepEqual(rankNavJumpMatches(withInert, "hid").rankedIndices, [])
  })

  it("boosts via learned keys", () => {
    const r = rankNavJumpMatches(candidates, "fav", ["/docs/guide"])
    // query "fav" alone misses; learned "/docs/guide" does not include "fav"
    assert.deepEqual(r.rankedIndices, [])
    const r2 = rankNavJumpMatches(candidates, "gui", ["/docs/guide"])
    assert.ok(r2.rankedIndices.includes(0))
  })

  it("serializes and parses jump payload", () => {
    const raw = serializeNavJumpQueryPayload("ab", ["k1"], 1, true)
    const parsed = parseNavJumpQueryPayload(raw)
    assert.equal(parsed.query, "ab")
    assert.deepEqual(parsed.learned, ["k1"])
    assert.equal(parsed.cycleDelta, 1)
    assert.equal(parsed.preview, true)
  })

  it("defaults preview to false", () => {
    const parsed = parseNavJumpQueryPayload(serializeNavJumpQueryPayload("x", [], 0))
    assert.equal(parsed.preview, false)
  })

  it("falls back to plain query string", () => {
    const parsed = parseNavJumpQueryPayload("plain")
    assert.equal(parsed.query, "plain")
    assert.equal(parsed.preview, false)
  })
})
