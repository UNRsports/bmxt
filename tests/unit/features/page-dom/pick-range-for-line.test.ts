import assert from "node:assert/strict"
import { after, before, describe, it } from "node:test"
import {
  pickRangeForLine,
  rangeAgreesWithSnippetHint
} from "../../../../shared/lib/features/page-dom/pick-search-needle-range.ts"

function mockRange(text: string): Range {
  return {
    toString: () => text
  } as unknown as Range
}

describe("pickRangeForLine", () => {
  let previousDocument: typeof globalThis.document | undefined

  before(() => {
    previousDocument = globalThis.document
    // EN: Force expandRangeText fallback to range.toString() (no real DOM Range API).
    globalThis.document = {
      body: {},
      createRange: () => {
        throw new Error("test harness: no Range")
      }
    } as unknown as Document
  })

  after(() => {
    if (previousDocument === undefined) {
      // @ts-expect-error cleanup
      delete globalThis.document
    } else {
      globalThis.document = previousDocument
    }
  })

  it("prefers snippet over a misleading globalOccurrence index", () => {
    const ranges = [
      mockRange("BMXt process lifecycle"),
      mockRange("bmxtRule (inter-command stream)"),
      mockRange("bmxtCandidate (prompt candidate menu)")
    ]
    const picked = pickRangeForLine(
      ranges,
      4,
      "bmxt",
      "bmxtCandidate (prompt candidate menu)",
      0,
      0
    )
    assert.ok(picked)
    assert.match(picked!.toString(), /bmxtCandidate/i)
  })

  it("rejects a range that does not agree with the snippet hint", () => {
    assert.equal(
      rangeAgreesWithSnippetHint(
        mockRange("BMXt process lifecycle"),
        "bmxtCandidate (prompt candidate menu)",
        "bmxt"
      ),
      false
    )
    assert.equal(
      rangeAgreesWithSnippetHint(
        mockRange("bmxtCandidate (prompt candidate menu)"),
        "bmxtCandidate (prompt candidate menu)",
        "bmxt"
      ),
      true
    )
  })
})
