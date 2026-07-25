import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  applyTabChipPickToLine,
  isTabChipTriggerToken,
  matchesTabChipNeedle,
  tabChipCompletionZone
} from "./tab-chip-token.ts"

describe("tabChipCompletionZone", () => {
  it("detects bare tab:", () => {
    const line = "tab:"
    const zone = tabChipCompletionZone(line, line.length)
    assert.ok(zone)
    assert.equal(zone.mode, "title")
    assert.equal(zone.needle, "")
    assert.equal(zone.tokenStart, 0)
    assert.equal(zone.tokenEnd, line.length)
  })

  it("detects title filter tab:foo", () => {
    const line = "tab:git"
    const zone = tabChipCompletionZone(line, line.length)
    assert.ok(zone)
    assert.equal(zone.mode, "title")
    assert.equal(zone.needle, "git")
  })

  it("detects URL filter tab::needle", () => {
    const line = "tab::github"
    const zone = tabChipCompletionZone(line, line.length)
    assert.ok(zone)
    assert.equal(zone.mode, "url")
    assert.equal(zone.needle, "github")
  })

  it("does not match tab command without colon", () => {
    assert.equal(tabChipCompletionZone("tab", 3), null)
    assert.equal(tabChipCompletionZone("tab -list", 9), null)
  })

  it("detects tab: after existing chips", () => {
    const line = "#t:12 tab:"
    const zone = tabChipCompletionZone(line, line.length)
    assert.ok(zone)
    assert.equal(zone.tokenStart, line.indexOf("tab:"))
    assert.equal(zone.mode, "title")
  })
})

describe("matchesTabChipNeedle", () => {
  it("filters by title", () => {
    assert.equal(matchesTabChipNeedle("Hello World", "https://ex.com", "hello", "title"), true)
    assert.equal(matchesTabChipNeedle("Hello World", "https://ex.com", "xyz", "title"), false)
  })

  it("filters by URL", () => {
    assert.equal(matchesTabChipNeedle("Hello", "https://github.com/x", "github", "url"), true)
    assert.equal(matchesTabChipNeedle("Hello", "https://example.com", "github", "url"), false)
  })
})

describe("isTabChipTriggerToken", () => {
  it("recognizes triggers", () => {
    assert.equal(isTabChipTriggerToken("tab:"), true)
    assert.equal(isTabChipTriggerToken("tab:foo"), true)
    assert.equal(isTabChipTriggerToken("tab::bar"), true)
    assert.equal(isTabChipTriggerToken("#t:12"), false)
    assert.equal(isTabChipTriggerToken("back"), false)
  })
})

describe("applyTabChipPickToLine", () => {
  it("replaces trigger with chip and reappends tab:", () => {
    const line = "tab:"
    const out = applyTabChipPickToLine(line, 0, 4, 42)
    assert.equal(out.line, "#t:42 tab:")
    assert.equal(out.cursor, "#t:42 tab:".length)
  })

  it("keeps prior chips", () => {
    const line = "#t:1 tab:foo"
    const start = line.indexOf("tab:")
    const out = applyTabChipPickToLine(line, start, line.length, 2)
    assert.equal(out.line, "#t:1 #t:2 tab:")
  })
})
