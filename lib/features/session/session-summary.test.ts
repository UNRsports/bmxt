import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { buildSessionListRows, buildSessionSummary, formatSessionListCandidateLabel } from "./session-summary.ts"

describe("buildSessionSummary", () => {
  it("lists open pickers and nav", () => {
    const summary = buildSessionSummary(
      {
        tabs: {
          showUrl: false,
          interactive: {
            hlSearchPattern: "foo",
            anchorTabId: null,
            markedKind: null,
            markedTabIds: [],
            markedWindowIds: [],
            markedGroupKeys: []
          }
        },
        search: { phase: "results", progressLines: [], entries: [], pattern: "bar" },
        dom: null,
        setting: null
      },
      true
    )
    assert.ok(summary.includes("tabs:foo"))
    assert.ok(summary.includes("search:bar"))
    assert.ok(summary.includes("nav"))
  })

  it("returns terminal only when empty", () => {
    assert.equal(buildSessionSummary(undefined, false), "(terminal only)")
  })
})

describe("formatSessionListCandidateLabel", () => {
  it("marks active session with asterisk", () => {
    const label = formatSessionListCandidateLabel({
      sessionId: "b",
      index: 2,
      isActive: true,
      summary: "tabs"
    })
    assert.equal(label, "*2  tabs")
  })

  it("uses space for inactive sessions", () => {
    const label = formatSessionListCandidateLabel({
      sessionId: "a",
      index: 1,
      isActive: false,
      summary: "(terminal only)"
    })
    assert.equal(label, " 1  (terminal only)")
  })
})

describe("buildSessionListRows", () => {
  it("marks active session with index", () => {
    const rows = buildSessionListRows({
      order: ["a", "b"],
      activeId: "b",
      pickersBySession: {},
      navArmedByLeaf: {}
    })
    assert.equal(rows.length, 2)
    assert.equal(rows[1]?.isActive, true)
    assert.equal(rows[1]?.index, 2)
  })
})
