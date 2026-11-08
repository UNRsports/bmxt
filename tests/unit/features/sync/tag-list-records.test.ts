import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  remoteTabRowsToListRecords,
  tagListRecords
} from "../../../../shared/lib/features/sync/bus/tag-list-records.ts"

describe("tagListRecords", () => {
  it("prefixes display and clears operable tabId for remote", () => {
    const tagged = tagListRecords(
      [
        {
          kind: "tabs.tab",
          fields: {
            tabId: 42,
            windowId: 1,
            groupId: null,
            title: "Example",
            url: "https://example.com/",
            active: false
          },
          display: { indent: 2, label: "Example", detail: "https://example.com/" }
        }
      ],
      { deviceId: "dev1", deviceName: "firefox@desk", remote: true }
    )
    assert.equal(tagged[0]!.fields.tabId, null)
    assert.equal(tagged[0]!.fields.remoteTabId, 42)
    assert.equal(tagged[0]!.fields.remote, true)
    assert.equal(tagged[0]!.display?.label, "[firefox@desk] Example")
  })
})

describe("remoteTabRowsToListRecords", () => {
  it("forwards portable favIconUrl into list fields", () => {
    const tagged = remoteTabRowsToListRecords(
      [
        {
          kind: "tab",
          tabId: 7,
          windowId: 1,
          groupId: null,
          title: "Keep",
          url: "https://keep.google.com/",
          active: false,
          favIconUrl: "https://ssl.gstatic.com/keep/keep_2020q4/icon.png"
        }
      ],
      { deviceId: "chrome1", deviceName: "chrome@desk", remote: true }
    )
    assert.equal(
      tagged[0]!.fields.favIconUrl,
      "https://ssl.gstatic.com/keep/keep_2020q4/icon.png"
    )
  })

  it("omits favIconUrl when absent from older peers or stripped wire", () => {
    const tagged = remoteTabRowsToListRecords(
      [
        {
          kind: "tab",
          tabId: 8,
          windowId: 1,
          groupId: null,
          title: "Old",
          url: "https://example.com/",
          active: false
        }
      ],
      { deviceId: "chrome1", deviceName: "chrome@desk", remote: true }
    )
    assert.equal(tagged[0]!.fields.favIconUrl, undefined)
  })
})
