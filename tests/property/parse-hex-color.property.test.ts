/**
 * EN: Property tests for parseHexColor (fast-check).
 * JA: parseHexColor のプロパティテスト（fast-check）。
 */

import assert from "node:assert/strict"
import { describe, it } from "node:test"
import * as fc from "fast-check"
import { parseHexColor } from "../../shared/lib/features/setting/validate-color.ts"

const hexDigit = fc.constantFrom(
  ..."0123456789abcdefABCDEF".split("")
)

describe("parseHexColor (property)", () => {
  it("never throws on arbitrary strings", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 64 }), (s) => {
        const out = parseHexColor(s)
        assert.ok(out === null || typeof out === "string")
      }),
      { numRuns: 200 }
    )
  })

  it("round-trips valid #rrggbb (case-normalized)", () => {
    fc.assert(
      fc.property(fc.array(hexDigit, { minLength: 6, maxLength: 6 }), (digits) => {
        const raw = `#${digits.join("")}`
        const out = parseHexColor(raw)
        assert.equal(out, `#${digits.join("").toLowerCase()}`)
        assert.equal(parseHexColor(out!), out)
      }),
      { numRuns: 100 }
    )
  })

  it("rejects strings without a leading #", () => {
    fc.assert(
      fc.property(
        fc
          .string({ minLength: 1, maxLength: 32 })
          .filter((s) => !s.trim().startsWith("#")),
        (s) => {
          assert.equal(parseHexColor(s), null)
        }
      ),
      { numRuns: 100 }
    )
  })
})
