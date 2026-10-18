/**
 * EN: Property tests for sanitizeSessionName (fast-check).
 * JA: sanitizeSessionName のプロパティテスト（fast-check）。
 */

import assert from "node:assert/strict"
import { describe, it } from "node:test"
import * as fc from "fast-check"
import {
  MAX_SESSION_NAME_LEN,
  sanitizeSessionName
} from "../../lib/features/session/session-summary.ts"

describe("sanitizeSessionName (property)", () => {
  it("never throws on arbitrary strings", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 200 }), (s) => {
        const out = sanitizeSessionName(s)
        assert.ok(out === null || typeof out === "string")
      }),
      { numRuns: 200 }
    )
  })

  it("accepted names equal trimmed input and stay within length", () => {
    fc.assert(
      fc.property(
        fc
          .string({ minLength: 1, maxLength: MAX_SESSION_NAME_LEN })
          .filter((s) => !/[\r\n\t\u0000-\u001f\u007f]/.test(s))
          .filter((s) => s.trim().length > 0)
          .filter((s) => s.trim().length <= MAX_SESSION_NAME_LEN),
        (s) => {
          const out = sanitizeSessionName(s)
          assert.equal(out, s.trim())
        }
      ),
      { numRuns: 100 }
    )
  })

  it("rejects when trimmed text still contains ASCII control characters", () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc
            .string({ minLength: 1, maxLength: 20 })
            .filter((s) => s.trim().length > 0 && !/[\r\n\t\u0000-\u001f\u007f]/.test(s)),
          fc.constantFrom("\n", "\r", "\t", "\u0000", "\u0007"),
          fc
            .string({ minLength: 1, maxLength: 20 })
            .filter((s) => s.trim().length > 0 && !/[\r\n\t\u0000-\u001f\u007f]/.test(s))
        ),
        ([a, ctrl, b]) => {
          const raw = `${a.trim()}${ctrl}${b.trim()}`
          assert.equal(sanitizeSessionName(raw), null)
        }
      ),
      { numRuns: 100 }
    )
  })
})
