/**
 * EN: Property tests for UTF-16 ↔ UTF-8 offset conversion (TS side of WASM caret contract).
 * JA: UTF-16 ↔ UTF-8 オフセット変換のプロパティテスト（WASM キャレット契約の TS 側）。
 */

import assert from "node:assert/strict"
import { describe, it } from "node:test"
import * as fc from "fast-check"
import {
  utf16OffsetToUtf8ByteOffset,
  utf8ByteOffsetToUtf16Offset
} from "../../lib/features/bmxt-core/utf16-utf8-offset.ts"

/** EN: Reject lone UTF-16 surrogates (TextEncoder replaces them; round-trip would fail). */
function isWellFormedUtf16(s: string): boolean {
  for (let i = 0; i < s.length; i += 1) {
    const c = s.charCodeAt(i)
    if (c >= 0xd800 && c <= 0xdbff) {
      if (i + 1 >= s.length) {
        return false
      }
      const low = s.charCodeAt(i + 1)
      if (low < 0xdc00 || low > 0xdfff) {
        return false
      }
      i += 1
      continue
    }
    if (c >= 0xdc00 && c <= 0xdfff) {
      return false
    }
  }
  return true
}

const wellFormedString = fc
  .string({ minLength: 0, maxLength: 64 })
  .filter(isWellFormedUtf16)

describe("utf16↔utf8 offset (property)", () => {
  it("round-trips every UTF-16 caret on well-formed strings", () => {
    fc.assert(
      fc.property(wellFormedString, (text) => {
        for (let utf16 = 0; utf16 <= text.length; utf16 += 1) {
          const bytes = utf16OffsetToUtf8ByteOffset(text, utf16)
          assert.equal(utf8ByteOffsetToUtf16Offset(text, bytes), utf16)
        }
      }),
      { numRuns: 80 }
    )
  })

  it("clamps out-of-range UTF-16 offsets without throwing", () => {
    fc.assert(
      fc.property(
        wellFormedString,
        fc.integer({ min: -1000, max: 10_000 }),
        (text, rawOffset) => {
          const bytes = utf16OffsetToUtf8ByteOffset(text, rawOffset)
          assert.ok(bytes >= 0)
          const back = utf8ByteOffsetToUtf16Offset(text, bytes)
          assert.ok(back >= 0 && back <= text.length)
        }
      ),
      { numRuns: 100 }
    )
  })

  it("floors mid-sequence UTF-8 byte offsets to a prior character boundary", () => {
    fc.assert(
      fc.property(
        wellFormedString.filter((s) => s.length > 0),
        fc.nat({ max: 200 }),
        (text, rawByte) => {
          const encodedLen = new TextEncoder().encode(text).length
          const byte = rawByte % (encodedLen + 3)
          const utf16 = utf8ByteOffsetToUtf16Offset(text, byte)
          assert.ok(utf16 >= 0 && utf16 <= text.length)
          const flooredBytes = utf16OffsetToUtf8ByteOffset(text, utf16)
          if (byte <= encodedLen) {
            assert.ok(flooredBytes <= byte)
          }
          assert.equal(utf8ByteOffsetToUtf16Offset(text, flooredBytes), utf16)
        }
      ),
      { numRuns: 80 }
    )
  })
})

