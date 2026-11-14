import assert from "node:assert/strict"
import { describe, it, before, after } from "node:test"
import { parseHTML } from "linkedom"
import { bmxtCollectPageNeedleMatchesInPage } from "../../../../shared/lib/features/page-extract/collect-page-needle-matches-in-page.ts"

describe("bmxtCollectPageNeedleMatchesInPage", () => {
  let previousDocument: typeof globalThis.document | undefined

  before(() => {
    const { document } = parseHTML(`<!DOCTYPE html><html><head><title>Repo bmxt title</title></head>
<body>
<p>alpha bmxt one</p>
<p>beta line</p>
<p>gamma BMXt two and bmxt three</p>
</body></html>`)
    previousDocument = globalThis.document
    // @ts-expect-error test harness assigns linkedom document
    globalThis.document = document
  })

  after(() => {
    if (previousDocument === undefined) {
      // @ts-expect-error cleanup
      delete globalThis.document
    } else {
      globalThis.document = previousDocument
    }
  })

  it("returns title and multiple body line hits for a needle", () => {
    const result = bmxtCollectPageNeedleMatchesInPage("bmxt", 50, 50_000)
    assert.equal(result.truncated, false)
    assert.ok(result.bodyLength > 0)
    const body = result.matches.filter((m) => m.lineNo > 0)
    assert.ok(body.length >= 2)
    assert.ok(result.matches.some((m) => m.lineNo === 0 && /bmxt/i.test(m.snippet)))
  })

  it("respects maxMatches", () => {
    const result = bmxtCollectPageNeedleMatchesInPage("bmxt", 2, 50_000)
    assert.ok(result.matches.length <= 2)
  })
})
