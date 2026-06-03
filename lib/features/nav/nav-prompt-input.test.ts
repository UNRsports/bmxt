import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  navBeforeInputAction,
  navTypingDeleteBackward,
  navTypingDeleteForward,
  navTypingInsert,
  navTypingLineBreakAllowed,
  navTypingShouldPreventLineBreakInput,
  promptMirrorSegments,
  isDirectLatinText,
  normalizeNavTypingInitialValue,
  sanitizeNavTypingBuffer,
  sanitizeNavTypingDomValueWithCursor,
  sanitizeNavTypingInsertText,
  stripNewlinesBeyondSnapshot
} from "./nav-prompt-input.ts"

describe("nav-prompt-input", () => {
  it("navBeforeInputAction", () => {
    assert.equal(navBeforeInputAction("deleteContentBackward", null), "backward")
    assert.equal(navBeforeInputAction("deleteContentForward", null), "forward")
    assert.equal(navBeforeInputAction("insertText", "a"), "insert")
    assert.equal(navBeforeInputAction("insertFromComposition", "あ"), "insert")
    assert.equal(navBeforeInputAction("insertCompositionText", "か"), null)
  })

  it("navTypingLineBreakAllowed", () => {
    assert.equal(navTypingLineBreakAllowed(false, false), false)
    assert.equal(navTypingLineBreakAllowed(false, true), false)
    assert.equal(navTypingLineBreakAllowed(true, false), false)
    assert.equal(navTypingLineBreakAllowed(true, true), true)
  })

  it("navTypingShouldPreventLineBreakInput", () => {
    assert.equal(navTypingShouldPreventLineBreakInput("insertLineBreak", false, true), true)
    assert.equal(navTypingShouldPreventLineBreakInput("insertLineBreak", true, true), false)
    assert.equal(navTypingShouldPreventLineBreakInput("insertText", false, true), false)
  })

  it("sanitizeNavTypingInsertText", () => {
    assert.equal(sanitizeNavTypingInsertText("a\nb", false, true), "ab")
    assert.equal(sanitizeNavTypingInsertText("a\nb", true, true), "a\nb")
    assert.equal(sanitizeNavTypingInsertText("a\nb", false, false), "ab")
  })

  it("sanitizeNavTypingBuffer", () => {
    assert.equal(sanitizeNavTypingBuffer("a\nb", false), "ab")
    assert.equal(sanitizeNavTypingBuffer("a\nb", true), "a\nb")
  })

  it("normalizeNavTypingInitialValue", () => {
    assert.equal(normalizeNavTypingInitialValue("\t", false), "")
    assert.equal(normalizeNavTypingInitialValue("  \n  ", false), "")
    assert.equal(normalizeNavTypingInitialValue("a\nb", true), "a\nb")
    assert.equal(normalizeNavTypingInitialValue("  hello ", false), "  hello ")
  })

  it("isDirectLatinText", () => {
    assert.equal(isDirectLatinText(""), false)
    assert.equal(isDirectLatinText("ab"), true)
    assert.equal(isDirectLatinText("a "), true)
    assert.equal(isDirectLatinText("あ"), false)
    assert.equal(isDirectLatinText("aあ"), false)
  })

  it("stripNewlinesBeyondSnapshot", () => {
    assert.equal(stripNewlinesBeyondSnapshot("a\nb", "ab"), "ab")
    assert.equal(stripNewlinesBeyondSnapshot("a\nb", "a\nb"), "a\nb")
    assert.equal(stripNewlinesBeyondSnapshot("a\nb\nc", "a\nb"), "a\nbc")
    assert.equal(stripNewlinesBeyondSnapshot("line1\nline2\n", "line1\nline2"), "line1\nline2")
  })

  it("sanitizeNavTypingDomValueWithCursor", () => {
    assert.deepEqual(
      sanitizeNavTypingDomValueWithCursor("a\nb", 3, false, ""),
      { value: "ab", cursor: 2 }
    )
    assert.deepEqual(
      sanitizeNavTypingDomValueWithCursor("a\nb\nc", 5, true, "a\nb"),
      { value: "a\nbc", cursor: 4 }
    )
  })

  it("navTypingInsert", () => {
    assert.deepEqual(navTypingInsert("hel", 3, 3, "lo"), { next: "hello", cursor: 5 })
    assert.deepEqual(navTypingInsert("abcd", 1, 3, "Z"), { next: "aZd", cursor: 2 })
  })

  it("navTypingDeleteBackward", () => {
    assert.deepEqual(navTypingDeleteBackward("hello", 5, 5), { next: "hell", cursor: 4 })
    assert.deepEqual(navTypingDeleteBackward("hello", 1, 4), { next: "ho", cursor: 1 })
    assert.equal(navTypingDeleteBackward("hello", 0, 0), null)
  })

  it("navTypingDeleteForward", () => {
    assert.deepEqual(navTypingDeleteForward("hello", 0, 0), { next: "ello", cursor: 0 })
    assert.deepEqual(navTypingDeleteForward("hello", 1, 4), { next: "ho", cursor: 1 })
    assert.equal(navTypingDeleteForward("hello", 5, 5), null)
  })

  it("promptMirrorSegments", () => {
    assert.deepEqual(promptMirrorSegments("hello", 2, false, 0), {
      before: "he",
      composition: "",
      cur: "l",
      after: "lo"
    })
    assert.deepEqual(promptMirrorSegments("preあい", 4, true, 3), {
      before: "pre",
      composition: "あ",
      cur: "",
      after: "い"
    })
    assert.deepEqual(promptMirrorSegments("test", 4, true, 0), {
      before: "",
      composition: "test",
      cur: "",
      after: ""
    })
  })
})
