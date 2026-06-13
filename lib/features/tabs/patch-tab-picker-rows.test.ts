import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { tabPickerRowsStructureKey } from "./tab-picker-rows-structure.ts"
import {
  consumePickerSelfTabActivation as consumeTabPickerSelfActivation,
  markPickerSelfTabActivation as markTabPickerSelfActivation
} from "../side-picker/preview/picker-self-tab-activation.ts"
import type { TabPickerRow } from "./picker-rows.ts"

const rows: TabPickerRow[] = [
  {
    kind: "window",
    windowId: 1,
    windowTitle: "Old active",
    usesActiveTabTitle: true,
    label: " [ウィンドウ] Old active",
    focused: true
  },
  {
    kind: "tab",
    tabId: 10,
    windowId: 1,
    groupId: null,
    title: "Old active",
    url: "https://example.com",
    faviconSrc: null,
    active: true
  },
  {
    kind: "tab",
    tabId: 11,
    windowId: 1,
    groupId: null,
    title: "Background",
    url: "https://mail.example.com",
    faviconSrc: null,
    active: false
  }
]

describe("tabPickerRowsStructureKey", () => {
  it("ignores title-only row changes", () => {
    const before = tabPickerRowsStructureKey(rows)
    const titlePatched = rows.map((row) =>
      row.kind === "tab" && row.tabId === 11 ? { ...row, title: "受信トレイ (1)" } : row
    )
    const after = tabPickerRowsStructureKey(titlePatched)
    assert.equal(before, after)
  })
})

describe("tab-picker-activation-suppression", () => {
  it("consumes a self-activation mark once", () => {
    markTabPickerSelfActivation(42)
    assert.equal(consumeTabPickerSelfActivation(42), true)
    assert.equal(consumeTabPickerSelfActivation(42), false)
  })
})
