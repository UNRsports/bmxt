import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  applyTabChipPickToLine,
  isOnlyTabChipTokens,
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

  it("reopens after bare tab: with trailing space (no chip yet)", () => {
    const line = "tab: "
    const zone = tabChipCompletionZone(line, line.length)
    assert.ok(zone)
    assert.equal(zone.mode, "title")
    assert.equal(zone.needle, "")
    assert.equal(zone.tokenStart, line.length)
    assert.equal(zone.tokenEnd, line.length)
  })

  it("reopens after bare tab:: with trailing space", () => {
    const line = "tab:: "
    const zone = tabChipCompletionZone(line, line.length)
    assert.ok(zone)
    assert.equal(zone.mode, "url")
    assert.equal(zone.needle, "")
  })

  it("reopens after tab: chips + trailing space", () => {
    const line = "tab: #t:12 "
    const zone = tabChipCompletionZone(line, line.length)
    assert.ok(zone)
    assert.equal(zone.mode, "title")
    assert.equal(zone.needle, "")
    assert.equal(zone.tokenStart, line.length)
    assert.equal(zone.tokenEnd, line.length)
  })

  it("reopens after chips + trailing space", () => {
    const line = "#t:12 "
    const zone = tabChipCompletionZone(line, line.length)
    assert.ok(zone)
    assert.equal(zone.mode, "title")
    assert.equal(zone.needle, "")
    assert.equal(zone.tokenStart, line.length)
    assert.equal(zone.tokenEnd, line.length)
  })

  it("filters by plain title needle after chips + space", () => {
    const line = "#t:12 foo"
    const zone = tabChipCompletionZone(line, line.length)
    assert.ok(zone)
    assert.equal(zone.mode, "title")
    assert.equal(zone.needle, "foo")
    assert.equal(zone.tokenStart, line.indexOf("foo"))
  })

  it("detects tab:: after chips", () => {
    const line = "#t:12 tab::bar"
    const zone = tabChipCompletionZone(line, line.length)
    assert.ok(zone)
    assert.equal(zone.mode, "url")
    assert.equal(zone.needle, "bar")
  })

  it("does not open on chip-only line without trailing space", () => {
    const line = "#t:12"
    assert.equal(tabChipCompletionZone(line, line.length), null)
  })

  it("does not treat bare text as continuation without chips", () => {
    assert.equal(tabChipCompletionZone("foo", 3), null)
    assert.equal(tabChipCompletionZone("foo ", 4), null)
  })

  it("does not open on pipe consumer stage after |", () => {
    const line = "#t:12 #t:34 |"
    assert.equal(tabChipCompletionZone(line, line.length), null)
  })
})

describe("isOnlyTabChipTokens", () => {
  it("requires at least one chip", () => {
    assert.equal(isOnlyTabChipTokens(""), false)
    assert.equal(isOnlyTabChipTokens("   "), false)
    assert.equal(isOnlyTabChipTokens("#t:1"), true)
    assert.equal(isOnlyTabChipTokens("#t:1 #t:2"), true)
    assert.equal(isOnlyTabChipTokens("tab: #t:1"), true)
    assert.equal(isOnlyTabChipTokens("tab:: #t:1 #t:2"), true)
    assert.equal(isOnlyTabChipTokens("#t:1 back"), false)
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
  it("keeps tab: command prefix when picking from bare tab:", () => {
    const line = "tab:"
    const out = applyTabChipPickToLine(line, 0, 4, 42, "title")
    assert.equal(out.line, "tab: #t:42")
    assert.equal(out.cursor, "tab: #t:42".length)
  })

  it("keeps tab:: command prefix for url-mode pick", () => {
    const line = "tab::git"
    const out = applyTabChipPickToLine(line, 0, line.length, 7, "url")
    assert.equal(out.line, "tab:: #t:7")
    assert.equal(out.cursor, "tab:: #t:7".length)
  })

  it("appends chip after prior chips without duplicating tab:", () => {
    const line = "tab: #t:1 tab:foo"
    const start = line.indexOf("tab:foo")
    const out = applyTabChipPickToLine(line, start, line.length, 2, "title")
    assert.equal(out.line, "tab: #t:1 #t:2")
    assert.equal(out.cursor, "tab: #t:1 #t:2".length)
  })

  it("inserts at empty continuation after space", () => {
    const line = "tab: #t:1 "
    const out = applyTabChipPickToLine(line, line.length, line.length, 2, "title")
    assert.equal(out.line, "tab: #t:1 #t:2")
    assert.equal(out.cursor, "tab: #t:1 #t:2".length)
  })
})
