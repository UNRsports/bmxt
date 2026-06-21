import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { buildSessionListRows, buildSessionSummary, buildSessionSwitchCommandLine, filterSessionSwitchPickerRows, formatSessionListCandidateLabel, formatSessionSwitchCandidateLabel, deriveDefaultSessionName, lastCommandFromSessionLog, resolveSessionDisplayName, resolveSessionRowByDisplayName, sanitizeSessionName } from "./session-summary.ts"

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
    assert.equal(buildSessionSummary(undefined, false, "en"), "(terminal only)")
    assert.equal(buildSessionSummary(undefined, false, "ja"), "(ターミナルのみ)")
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

describe("filterSessionSwitchPickerRows", () => {
  it("filters by contains while the picker is open", () => {
    const rows = buildSessionListRows({
      order: ["a", "b"],
      activeId: "a",
      namesById: { a: "tabs", b: "manual" },
      logsById: {},
      pickersBySession: {},
      navArmedByLeaf: {}
    })
    const filtered = filterSessionSwitchPickerRows(rows, "ab", "contains")
    assert.equal(filtered.length, 1)
    assert.equal(filtered[0]!.displayName, "tabs")
  })
})

describe("buildSessionSwitchCommandLine", () => {
  it("builds a complete switch command", () => {
    const rows = buildSessionListRows({
      order: ["a"],
      activeId: "a",
      namesById: { a: "work" },
      logsById: {},
      pickersBySession: {},
      navArmedByLeaf: {}
    })
    assert.equal(buildSessionSwitchCommandLine(rows[0]!, rows), "session -switch work")
  })
})

describe("formatSessionSwitchCandidateLabel", () => {
  it("shows display name with active mark", () => {
    const rows = buildSessionListRows({
      order: ["a", "b"],
      activeId: "b",
      namesById: { b: "work" },
      logsById: {},
      pickersBySession: {},
      navArmedByLeaf: {}
    })
    const label = formatSessionSwitchCandidateLabel(rows[1]!, rows)
    assert.equal(label, "*work")
  })

  it("disambiguates duplicate names with index", () => {
    const rows = buildSessionListRows({
      order: ["a", "b"],
      activeId: "a",
      namesById: { a: "tabs", b: "tabs" },
      logsById: {},
      pickersBySession: {},
      navArmedByLeaf: {}
    })
    assert.equal(formatSessionSwitchCandidateLabel(rows[0]!, rows), "*tabs (1)")
    assert.equal(formatSessionSwitchCandidateLabel(rows[1]!, rows), " tabs (2)")
  })
})

describe("resolveSessionRowByDisplayName", () => {
  it("resolves unique display name", () => {
    const rows = buildSessionListRows({
      order: ["a", "b"],
      activeId: "a",
      namesById: { b: "work" },
      logsById: {},
      pickersBySession: {},
      navArmedByLeaf: {}
    })
    const row = resolveSessionRowByDisplayName(rows, "work")
    assert.equal(row?.sessionId, "b")
  })

  it("resolves indexed label for duplicates", () => {
    const rows = buildSessionListRows({
      order: ["a", "b"],
      activeId: "a",
      namesById: { a: "tabs", b: "tabs" },
      logsById: {},
      pickersBySession: {},
      navArmedByLeaf: {}
    })
    const row = resolveSessionRowByDisplayName(rows, "tabs (2)")
    assert.equal(row?.sessionId, "b")
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
