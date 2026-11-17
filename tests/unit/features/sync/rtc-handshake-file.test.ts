import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { generateFamilySeed } from "../../../../shared/lib/features/sync/crypto/family-crypto.ts"
import { formatRtcHandshakeCode } from "../../../../shared/lib/features/sync/discovery/rtc-handshake-codec.ts"
import {
  buildRtcHandshakeFileJson,
  parseRtcHandshakeFileText,
  rtcHandshakeFileName,
  RTC_HANDSHAKE_FILE_KIND,
  RTC_HANDSHAKE_FILE_VERSION
} from "../../../../shared/lib/features/sync/discovery/rtc-handshake-file.ts"

async function sampleOfferCode(): Promise<string> {
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
  return code!
}

describe("rtc-handshake-file", () => {
  it("names offer and answer files", () => {
    assert.equal(rtcHandshakeFileName("offer"), "bmxt-offer.json")
    assert.equal(rtcHandshakeFileName("answer"), "bmxt-answer.json")
  })

  it("round-trips a structured offer JSON file", async () => {
    const code = await sampleOfferCode()
    const json = buildRtcHandshakeFileJson({ role: "offer", code })
    assert.ok(json)
    const parsed = parseRtcHandshakeFileText(json!)
    assert.equal(parsed.ok, true)
    if (!parsed.ok) {
      return
    }
    assert.equal(parsed.role, "offer")
    assert.equal(parsed.code, code)
    const asObject = JSON.parse(json!) as Record<string, unknown>
    assert.equal(asObject.v, RTC_HANDSHAKE_FILE_VERSION)
    assert.equal(asObject.kind, RTC_HANDSHAKE_FILE_KIND)
  })

  it("accepts a bare handshake code as file body", async () => {
    const code = await sampleOfferCode()
    const parsed = parseRtcHandshakeFileText(`  ${code}\n`)
    assert.equal(parsed.ok, true)
    if (!parsed.ok) {
      return
    }
    assert.equal(parsed.role, null)
    assert.equal(parsed.code, code)
  })

  it("rejects wrong kind / version / role shape", () => {
    assert.equal(
      parseRtcHandshakeFileText(
        JSON.stringify({
          v: 1,
          kind: "other",
          role: "offer",
          code: "bmxt-rtc1.aaaaaaaaaaaaaaaa"
        })
      ).ok,
      false
    )
    assert.equal(
      parseRtcHandshakeFileText(
        JSON.stringify({
          v: 2,
          kind: RTC_HANDSHAKE_FILE_KIND,
          role: "offer",
          code: "bmxt-rtc1.aaaaaaaaaaaaaaaa"
        })
      ).ok,
      false
    )
    assert.equal(
      parseRtcHandshakeFileText(
        JSON.stringify({
          v: 1,
          kind: RTC_HANDSHAKE_FILE_KIND,
          role: "nope",
          code: "bmxt-rtc1.aaaaaaaaaaaaaaaa"
        })
      ).ok,
      false
    )
  })

  it("rejects empty and oversized input", () => {
    assert.equal(parseRtcHandshakeFileText("").ok, false)
    assert.equal(parseRtcHandshakeFileText("   ").ok, false)
    assert.equal(parseRtcHandshakeFileText("x".repeat(70_000)).ok, false)
  })

  it("buildRtcHandshakeFileJson returns null for invalid code", () => {
    assert.equal(buildRtcHandshakeFileJson({ role: "offer", code: "not-a-code" }), null)
  })
})
