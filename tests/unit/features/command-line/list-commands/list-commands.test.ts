import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { matchPlainListCommand } from "../../../../../shared/lib/features/command-line/list-commands/registry.ts"

describe("list-commands registry", () => {
  it("matches plain tab -list", () => {
    const matched = matchPlainListCommand("tab -list")
    assert.notEqual(matched, null)
    assert.equal(matched!.entry.id, "tabs")
  })

  it("matches tab -list -url", () => {
    const matched = matchPlainListCommand("tab -list -url")
    assert.notEqual(matched, null)
    assert.deepEqual(matched!.match, {
      showUrl: true,
      scope: { kind: "local" }
    })
  })

  it("rejects unknown tokens on tab -list", () => {
    assert.equal(matchPlainListCommand("tab -list --picker"), null)
  })

  it("rejects incomplete --device and scope conflicts on tab -list", () => {
    assert.equal(matchPlainListCommand("tab -list --device"), null)
    assert.equal(matchPlainListCommand("tab -list --device --peers"), null)
    assert.equal(matchPlainListCommand("tab -list --device x --peers"), null)
    assert.equal(matchPlainListCommand("tab -list --peers --device x"), null)
  })

  it("matches tab -list --device <id> and --peers", () => {
    const device = matchPlainListCommand("tab -list --device abc123")
    assert.notEqual(device, null)
    assert.equal(device!.entry.id, "tabs")
    assert.deepEqual(device!.match, {
      showUrl: false,
      scope: { kind: "device", deviceId: "abc123" }
    })
    const peers = matchPlainListCommand("tab -list --peers")
    assert.notEqual(peers, null)
    assert.deepEqual(peers!.match, {
      showUrl: false,
      scope: { kind: "peers" }
    })
  })

  it("matches plain search -list", () => {
    const matched = matchPlainListCommand("search -list foo")
    assert.notEqual(matched, null)
    assert.equal(matched!.entry.id, "search")
  })
})
