import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  parseDeviceListScopeTokens,
  stripDeviceScopeFromSearchDispatchLine
} from "../../../../shared/lib/features/sync/bus/device-list-scope.ts"

describe("parseDeviceListScopeTokens", () => {
  it("defaults to local", () => {
    const parsed = parseDeviceListScopeTokens(["-url"])
    assert.equal(parsed.ok, true)
    if (!parsed.ok) {
      return
    }
    assert.deepEqual(parsed.scope, { kind: "local" })
    assert.deepEqual(parsed.rest, ["-url"])
  })

  it("parses --peers", () => {
    const parsed = parseDeviceListScopeTokens(["--peers", "--all"])
    assert.equal(parsed.ok, true)
    if (!parsed.ok) {
      return
    }
    assert.deepEqual(parsed.scope, { kind: "peers" })
    assert.deepEqual(parsed.rest, ["--all"])
  })

  it("parses --device id", () => {
    const parsed = parseDeviceListScopeTokens(["--device", "dev1", "foo"])
    assert.equal(parsed.ok, true)
    if (!parsed.ok) {
      return
    }
    assert.deepEqual(parsed.scope, { kind: "device", deviceId: "dev1" })
    assert.deepEqual(parsed.rest, ["foo"])
  })
})

describe("stripDeviceScopeFromSearchDispatchLine", () => {
  it("removes routing flags", () => {
    assert.equal(
      stripDeviceScopeFromSearchDispatchLine("search -list --peers --all pattern"),
      "search -list --all pattern"
    )
    assert.equal(
      stripDeviceScopeFromSearchDispatchLine("search -list --device abc --history x"),
      "search -list --history x"
    )
  })
})
