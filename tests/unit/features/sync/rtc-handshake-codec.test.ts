import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { generateFamilySeed } from "../../../../shared/lib/features/sync/crypto/family-crypto.ts"
import {
  formatRtcHandshakeCode,
  parseRtcHandshakeCode,
  RTC_HANDSHAKE_PREFIX
} from "../../../../shared/lib/features/sync/discovery/rtc-handshake-codec.ts"

describe("rtc-handshake-codec", () => {
  it("round-trips a Family-sealed offer code", async () => {
    const { familyId, seedB64 } = generateFamilySeed()
    const code = await formatRtcHandshakeCode({
      familyId,
      seedB64,
      fromDeviceId: "deviceAAAAAAAA",
      plain: {
        v: 1,
        role: "offer",
        sessionId: "sessionBBBBBBBB",
        fromDeviceId: "deviceAAAAAAAA",
        fromDisplayName: "chrome@test",
        familyId,
        sdp: "v=0\r\no=- 1 1 IN IP4 127.0.0.1\r\n",
        ice: ['{"candidate":"candidate:1 1 udp 1 127.0.0.1 9 typ host"}']
      }
    })
    assert.ok(code)
    assert.ok(code!.startsWith(RTC_HANDSHAKE_PREFIX))
    const parsed = await parseRtcHandshakeCode(code!, seedB64)
    assert.ok(parsed)
    assert.equal(parsed!.role, "offer")
    assert.equal(parsed!.fromDeviceId, "deviceAAAAAAAA")
    assert.equal(parsed!.sessionId, "sessionBBBBBBBB")
  })

  it("rejects codes sealed with a different Family seed", async () => {
    const a = generateFamilySeed()
    const b = generateFamilySeed()
    const code = await formatRtcHandshakeCode({
      familyId: a.familyId,
      seedB64: a.seedB64,
      fromDeviceId: "deviceAAAAAAAA",
      plain: {
        v: 1,
        role: "answer",
        sessionId: "sessionCCCCCCCC",
        fromDeviceId: "deviceAAAAAAAA",
        fromDisplayName: "firefox@test",
        familyId: a.familyId,
        sdp: "v=0\r\n",
        ice: []
      }
    })
    assert.ok(code)
    const parsed = await parseRtcHandshakeCode(code!, b.seedB64)
    assert.equal(parsed, null)
  })
})
