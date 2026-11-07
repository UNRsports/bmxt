import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { parseTabsListLine } from "../../../../shared/lib/features/tabs/tabs-list-parse.ts"

describe("parseTabsListLine", () => {
  it("parses bare list", () => {
    assert.deepEqual(parseTabsListLine("tab -list"), {
      showUrl: false,
      scope: { kind: "local" }
    })
  })

  it("parses -url", () => {
    assert.deepEqual(parseTabsListLine("tab -list -url"), {
      showUrl: true,
      scope: { kind: "local" }
    })
  })

  it("parses --peers with -url", () => {
    assert.deepEqual(parseTabsListLine("tab -list -url --peers"), {
      showUrl: true,
      scope: { kind: "peers" }
    })
  })

  it("parses --device <id>", () => {
    assert.deepEqual(parseTabsListLine("tab -list --device abc123"), {
      showUrl: false,
      scope: { kind: "device", deviceId: "abc123" }
    })
  })

  it("rejects unknown flags and conflicts", () => {
    assert.equal(parseTabsListLine("tab -list --picker"), null)
    assert.equal(parseTabsListLine("tab -list --foo"), null)
    assert.equal(parseTabsListLine("tab -list --device"), null)
    assert.equal(parseTabsListLine("tab -list --device x --peers"), null)
    assert.equal(parseTabsListLine("tab -list --peers --device x"), null)
  })
})
