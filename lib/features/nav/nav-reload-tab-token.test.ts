import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  deleteNavReloadTabBlockAtCursor,
  deleteNavReloadTabBlockForwardAtCursor,
  findNavReloadTabTokenSpans,
  formatNavReloadTabToken,
  isNavReloadTabBlockFocused,
  moveNavReloadTabBlockCaret,
  navReloadTabCompletionZone,
  parseNavReloadTabToken,
  snapNavReloadTabBlockCaret,
  truncateNavReloadChipTitle
} from "./nav-reload-tab-token.ts"

describe("nav-reload-tab-token", () => {
  it("parses and formats #t:<id>", () => {
    assert.equal(formatNavReloadTabToken(42), "#t:42")
    assert.equal(parseNavReloadTabToken("#t:42"), 42)
    assert.equal(parseNavReloadTabToken("nope"), null)
  })

  it("finds spans in a line", () => {
    const spans = findNavReloadTabTokenSpans("nav -reload #t:1 #t:99")
    assert.equal(spans.length, 2)
    assert.equal(spans[0]?.tabId, 1)
    assert.equal(spans[1]?.tabId, 99)
  })

  it("deletes a whole block on backspace into #t:id", () => {
    const line = "nav -reload #t:12 "
    const atEndOfToken = line.indexOf("#t:12") + "#t:12".length
    const result = deleteNavReloadTabBlockAtCursor(line, atEndOfToken)
    assert.ok(result)
    assert.equal(result.line, "nav -reload ")
    assert.equal(result.cursor, "nav -reload ".length)
  })

  it("deletes a whole block on forward delete at #t:id start", () => {
    const line = "nav -reload #t:12 "
    const atStart = line.indexOf("#t:12")
    const result = deleteNavReloadTabBlockForwardAtCursor(line, atStart)
    assert.ok(result)
    assert.equal(result.line, "nav -reload ")
    assert.equal(result.cursor, "nav -reload ".length)
  })

  it("treats caret on a block as focused for chip UI", () => {
    const line = "nav -reload #t:12"
    const span = findNavReloadTabTokenSpans(line)[0]!
    assert.equal(isNavReloadTabBlockFocused(line, span.start, span), true)
    assert.equal(isNavReloadTabBlockFocused(line, span.end, span), true)
    assert.equal(isNavReloadTabBlockFocused(line, span.start - 1, span), false)
  })

  it("truncates long chip titles with an ellipsis", () => {
    assert.equal(truncateNavReloadChipTitle("short", 24), "short")
    assert.equal(truncateNavReloadChipTitle("abcdefghij", 5), "abcd…")
    assert.equal(truncateNavReloadChipTitle("あいうえおかきくけこ", 5), "あいうえ…")
  })

  it("moves caret one #t: block at a time", () => {
    const line = "nav -reload #t:1 #t:22 #t:333"
    const spans = findNavReloadTabTokenSpans(line)
    assert.equal(spans.length, 3)
    const a = spans[0]!.end
    const b = spans[1]!.end
    const c = spans[2]!.end
    assert.equal(moveNavReloadTabBlockCaret(line, a, 1), b)
    assert.equal(moveNavReloadTabBlockCaret(line, b, 1), c)
    assert.equal(moveNavReloadTabBlockCaret(line, b, -1), a)
    assert.equal(moveNavReloadTabBlockCaret(line, a, -1), spans[0]!.start)
    // EN: Entering the first chip from the lead jumps to its end in one step.
    assert.equal(moveNavReloadTabBlockCaret(line, spans[0]!.start - 1, 1), a)
    // EN: Mid-token snaps forward to block end.
    assert.equal(moveNavReloadTabBlockCaret(line, spans[1]!.start + 2, 1), b)
    assert.equal(snapNavReloadTabBlockCaret(line, spans[1]!.start + 2), b)
  })

  it("detects completion zone after nav -reload ", () => {
    const zone = navReloadTabCompletionZone("nav -reload ", "nav -reload ".length)
    assert.ok(zone)
    assert.equal(zone.prefix, "")
    assert.equal(navReloadTabCompletionZone("nav -reload", "nav -reload".length), null)
  })
})
