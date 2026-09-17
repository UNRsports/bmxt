import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  utf16OffsetToUtf8ByteOffset,
  utf8ByteOffsetToUtf16Offset
} from "./utf16-utf8-offset.ts"

describe("utf16OffsetToUtf8ByteOffset", () => {
  it("matches for ASCII", () => {
    assert.equal(utf16OffsetToUtf8ByteOffset("tab -list", 4), 4)
    assert.equal(utf16OffsetToUtf8ByteOffset("tab -list", 9), 9)
  })

  it("expands for BMP CJK (3 UTF-8 bytes per char)", () => {
    const line = "search -list --all リスト | browse"
    assert.equal(line.length, 31)
    assert.equal(utf16OffsetToUtf8ByteOffset(line, 19), 19)
    assert.equal(utf16OffsetToUtf8ByteOffset(line, 20), 22)
    assert.equal(utf16OffsetToUtf8ByteOffset(line, 21), 25)
    assert.equal(utf16OffsetToUtf8ByteOffset(line, 22), 28)
    assert.equal(utf16OffsetToUtf8ByteOffset(line, line.length), 37)
  })
})

describe("utf8ByteOffsetToUtf16Offset", () => {
  it("round-trips CJK caret positions", () => {
    const line = "search -list --all リスト | browse"
    for (let utf16 = 0; utf16 <= line.length; utf16 += 1) {
      const bytes = utf16OffsetToUtf8ByteOffset(line, utf16)
      assert.equal(utf8ByteOffsetToUtf16Offset(line, bytes), utf16)
    }
  })

  it("floors mid-sequence byte offsets to the prior character", () => {
    const line = "search -list --all リスト | browse"
    assert.equal(utf8ByteOffsetToUtf16Offset(line, 20), 19)
    assert.equal(utf8ByteOffsetToUtf16Offset(line, 21), 19)
    assert.equal(utf8ByteOffsetToUtf16Offset(line, 23), 20)
  })
})
