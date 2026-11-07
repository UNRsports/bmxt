import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { tagListRecords } from "../../../../shared/lib/features/sync/bus/tag-list-records.ts"

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
