import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { plainLabelPartsForTabPickerRow } from "./tabs-list-label-parts.ts"
import type { TabPickerRow } from "./picker-rows.ts"

describe("plainLabelPartsForTabPickerRow", () => {
  it("uses full-word i18n keys instead of W/G/T abbreviations", () => {
    const rows: TabPickerRow[] = [
      {
        kind: "window",
        windowId: 1,
        label: "ignored picker label",
        windowTitle: "Win",
        usesActiveTabTitle: true,
        focused: true
      },
      {
        kind: "group",
        windowId: 1,
        groupId: 2,
        label: "【Work】",
        color: "blue"
      },
      {
        kind: "tab",
        tabId: 9,
        windowId: 1,
        groupId: null,
        groupColor: null,
        title: "Tab",
        url: "https://example.com",
        faviconSrc: null,
        active: true
      }
    ]

    assert.deepEqual(plainLabelPartsForTabPickerRow(rows[0]!), {
      key: "tabs.list.plain.windowFocused",
      vars: { windowId: "1", title: "Win" }
    })
    assert.deepEqual(plainLabelPartsForTabPickerRow(rows[1]!), {
      key: "tabs.list.plain.group",
      vars: { groupId: "2", label: "【Work】" }
    })
    assert.deepEqual(plainLabelPartsForTabPickerRow(rows[2]!), {
      key: "tabs.list.plain.tabActive",
      vars: { tabId: "9", title: "Tab" },
      url: "https://example.com"
    })
  })
})
