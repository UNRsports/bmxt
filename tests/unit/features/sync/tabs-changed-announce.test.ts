import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  buildTabsChangedSignal,
  familySignalTargetsTabPicker,
  listTabsChangedAnnounceTargets,
  normalizeFamilySignalFirstCommand
} from "../../../../shared/lib/features/sync/bus/tabs-changed-announce.ts"

describe("listTabsChangedAnnounceTargets", () => {
  it("includes every connected peer except self", () => {
    const targets = listTabsChangedAnnounceTargets("A", [
      { deviceId: "A", state: "connected" },
      { deviceId: "B", state: "connected" },
      { deviceId: "C", state: "connected" }
    ])
    assert.deepEqual(targets, ["B", "C"])
  })

  it("skips disconnected peers and pending-offer", () => {
    const targets = listTabsChangedAnnounceTargets("A", [
      { deviceId: "B", state: "disconnected" },
      { deviceId: "C", state: "signaling" },
      { deviceId: "pending-offer", state: "connected" },
      { deviceId: "D", state: "connected" }
    ])
    assert.deepEqual(targets, ["D"])
  })
})

describe("normalizeFamilySignalFirstCommand", () => {
  it("defaults missing to tab for wire compat", () => {
    assert.equal(normalizeFamilySignalFirstCommand(undefined), "tab")
    assert.equal(normalizeFamilySignalFirstCommand(null), "tab")
  })

  it("accepts tab and future first-command tokens", () => {
    assert.equal(normalizeFamilySignalFirstCommand("tab"), "tab")
    assert.equal(normalizeFamilySignalFirstCommand("search"), "search")
  })

  it("rejects invalid tokens", () => {
    assert.equal(normalizeFamilySignalFirstCommand(""), null)
    assert.equal(normalizeFamilySignalFirstCommand("Tab"), null)
    assert.equal(normalizeFamilySignalFirstCommand("tab-list"), null)
    assert.equal(normalizeFamilySignalFirstCommand(1), null)
  })
})

describe("buildTabsChangedSignal / familySignalTargetsTabPicker", () => {
  it("builds a tab signal and targets the tab picker", () => {
    const signal = buildTabsChangedSignal({ reason: "open_tabs", first: "tab" })
    assert.deepEqual(signal, { reason: "open_tabs", first: "tab" })
    assert.equal(familySignalTargetsTabPicker(signal!.first), true)
  })

  it("ignores non-tab first codes for the tab picker", () => {
    const signal = buildTabsChangedSignal({ reason: "tabs_ops", first: "search" })
    assert.equal(signal!.first, "search")
    assert.equal(familySignalTargetsTabPicker(signal!.first), false)
  })

  it("treats omitted first as tab", () => {
    const signal = buildTabsChangedSignal({ reason: "local_close", first: undefined })
    assert.deepEqual(signal, { reason: "local_close", first: "tab" })
  })
})
