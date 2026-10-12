/**
 * EN: Unit tests for host-switch snapshot helpers.
 */

import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  appendLinesToHostSnapshot,
  isHostSwitchSnapshot,
  parseHostSwitchSnapshot,
  resolvePickersForHostSwitch
} from "./host-switch-snapshot.ts"
import { createEmptyFloatBrowseState } from "./float-browse-state-storage.ts"

describe("host-switch-snapshot", () => {
  const sessions = {
    v: 2 as const,
    order: ["s1"],
    activeId: "s1",
    logsById: { s1: ["hello"] },
    namesById: {}
  }

  it("accepts a valid snapshot", () => {
    const raw = { sessions, browse: createEmptyFloatBrowseState(), floatTabId: 3 }
    assert.equal(isHostSwitchSnapshot(raw), true)
    const parsed = parseHostSwitchSnapshot(raw)
    assert.ok(parsed)
    assert.equal(parsed.floatTabId, 3)
    assert.deepEqual(parsed.sessions.logsById.s1, ["hello"])
    assert.equal(parsed.pickersBySession, undefined)
  })

  it("round-trips pickersBySession including tab highlight", () => {
    const raw = {
      sessions,
      browse: createEmptyFloatBrowseState(),
      pickersBySession: {
        s1: {
          tabs: {
            rows: [],
            showUrl: false,
            initialHi: 4,
            interactive: {
              anchorTabId: 99,
              markedKind: null,
              markedTabIds: [],
              markedWindowIds: [],
              markedGroupKeys: [],
              hlSearchPattern: ""
            }
          },
          search: null,
          dom: null,
          setting: null
        }
      }
    }
    assert.equal(isHostSwitchSnapshot(raw), true)
    const parsed = parseHostSwitchSnapshot(raw)
    assert.ok(parsed)
    assert.equal(parsed.pickersBySession?.s1?.tabs?.initialHi, 4)
    assert.equal(parsed.pickersBySession?.s1?.tabs?.interactive?.anchorTabId, 99)
  })

  it("rejects non-object pickersBySession", () => {
    assert.equal(
      isHostSwitchSnapshot({
        sessions,
        browse: createEmptyFloatBrowseState(),
        pickersBySession: "bad"
      }),
      false
    )
  })

  it("resolvePickersForHostSwitch prefers live snapshot over storage", () => {
    const live = {
      s1: {
        tabs: { rows: [], showUrl: false, initialHi: 2 },
        search: null,
        dom: null,
        setting: null
      }
    }
    const stored = {
      s1: {
        tabs: { rows: [], showUrl: false, initialHi: 9 },
        search: null,
        dom: null,
        setting: null
      }
    }
    const resolved = resolvePickersForHostSwitch(
      { sessions, browse: createEmptyFloatBrowseState(), pickersBySession: live },
      stored
    )
    assert.equal(resolved.s1?.tabs?.initialHi, 2)
  })

  it("resolvePickersForHostSwitch falls back to storage when field omitted", () => {
    const stored = {
      s1: {
        tabs: { rows: [], showUrl: false, initialHi: 9 },
        search: null,
        dom: null,
        setting: null
      }
    }
    const resolved = resolvePickersForHostSwitch(
      { sessions, browse: createEmptyFloatBrowseState() },
      stored
    )
    assert.equal(resolved.s1?.tabs?.initialHi, 9)
  })

  it("appends lines onto the active session", () => {
    const next = appendLinesToHostSnapshot(
      { sessions, browse: createEmptyFloatBrowseState() },
      "s1",
      ["> switchwindow", "moved"]
    )
    assert.deepEqual(next.sessions.logsById.s1, ["hello", "> switchwindow", "moved"])
  })

  it("rejects invalid sessions", () => {
    assert.equal(
      isHostSwitchSnapshot({ sessions: { v: 1 }, browse: createEmptyFloatBrowseState() }),
      false
    )
  })
})
