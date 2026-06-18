import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { buildSessionListRows, buildSessionSummary, formatSessionListCandidateLabel, deriveDefaultSessionName, lastCommandFromSessionLog, resolveSessionDisplayName, sanitizeSessionName } from "./session-summary.ts"

describe("sanitizeSessionName", () => {
  it("accepts trimmed names", () => {
    assert.equal(sanitizeSessionName("  my session  "), "my session")
  })

  it("rejects control characters", () => {
    assert.equal(sanitizeSessionName("bad\nname"), null)
  })
})

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

describe("lastCommandFromSessionLog", () => {
  it("skips session commands", () => {
    const cmd = lastCommandFromSessionLog([
      "> tabs -list",
      "> session -new",
      "> search foo"
    ])
    assert.equal(cmd, "search foo")
  })
})

describe("deriveDefaultSessionName", () => {
  it("prefers open pickers over last command", () => {
    const name = deriveDefaultSessionName({
      pickers: {
        tabs: null,
        search: { phase: "results", progressLines: [], entries: [], pattern: "foo" },
        dom: null,
        setting: null
      },
      navArmed: false,
      logs: ["> tabs -list"],
      fallbackIndex: 2
    })
    assert.equal(name, "search:foo")
  })

  it("falls back to last command when no pickers", () => {
    const name = deriveDefaultSessionName({
      pickers: undefined,
      navArmed: false,
      logs: ["> dom -list body"],
      fallbackIndex: 2
    })
    assert.equal(name, "dom -list body")
  })
})

describe("resolveSessionDisplayName", () => {
  it("uses stored name when present", () => {
    const name = resolveSessionDisplayName({
      sessionId: "a",
      index: 1,
      namesById: { a: "work" },
      pickers: undefined,
      navArmed: false,
      logs: []
    })
    assert.equal(name, "work")
  })
})

describe("formatSessionListCandidateLabel", () => {
  it("marks active session with asterisk", () => {
    const label = formatSessionListCandidateLabel({
      sessionId: "b",
      index: 2,
      isActive: true,
      summary: "tabs",
      displayName: "work"
    })
    assert.equal(label, "*2  work")
  })

  it("uses space for inactive sessions", () => {
    const label = formatSessionListCandidateLabel({
      sessionId: "a",
      index: 1,
      isActive: false,
      summary: "(terminal only)",
      displayName: "(terminal only)"
    })
    assert.equal(label, " 1  (terminal only)")
  })
})

describe("buildSessionListRows", () => {
  it("marks active session with index", () => {
    const rows = buildSessionListRows({
      order: ["a", "b"],
      activeId: "b",
      namesById: { b: "second" },
      logsById: {},
      pickersBySession: {},
      navArmedByLeaf: {}
    })
    assert.equal(rows.length, 2)
    assert.equal(rows[1]?.isActive, true)
    assert.equal(rows[1]?.index, 2)
    assert.equal(rows[1]?.displayName, "second")
  })
})
