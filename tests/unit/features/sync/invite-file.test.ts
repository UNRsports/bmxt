import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { formatInvite } from "../../../../shared/lib/features/sync/discovery/invite-codec.ts"
import { generateFamilySeed } from "../../../../shared/lib/features/sync/crypto/family-crypto.ts"
import {
  buildFamilyInviteFileJson,
  familyInviteFileName,
  parseFamilyInviteFileText,
  FAMILY_INVITE_FILE_KIND,
  FAMILY_INVITE_FILE_VERSION
} from "../../../../shared/lib/features/sync/handshake/file/invite-file.ts"
import { formatBmxtTicketStamp } from "../../../../shared/lib/features/sync/handshake/file/ticket-stamp.ts"

describe("invite-file", () => {
  it("names invite files with a sortable timestamp", () => {
    const at = new Date(2026, 10, 17, 11, 42, 5)
    assert.equal(formatBmxtTicketStamp(at), "20261117-114205")
    assert.equal(familyInviteFileName(at), "bmxt-20261117-114205-invite.json")
  })

  it("round-trips a structured invite JSON file", () => {
    const { familyId, seedB64 } = generateFamilySeed()
    const code = formatInvite({
      version: 1,
      familyId,
      seedB64,
      fromDeviceId: "deviceAAAAAAAA",
      fromDisplayName: "chrome@test"
    })
    const json = buildFamilyInviteFileJson({ code })
    assert.ok(json)
    const parsed = parseFamilyInviteFileText(json!)
    assert.equal(parsed.ok, true)
    if (!parsed.ok) {
      return
    }
    assert.equal(parsed.code, code)
    const asObject = JSON.parse(json!) as Record<string, unknown>
    assert.equal(asObject.v, FAMILY_INVITE_FILE_VERSION)
    assert.equal(asObject.kind, FAMILY_INVITE_FILE_KIND)
  })

  it("accepts a bare invite token as file body", () => {
    const { familyId, seedB64 } = generateFamilySeed()
    const code = formatInvite({
      version: 1,
      familyId,
      seedB64,
      fromDeviceId: "deviceAAAAAAAA",
      fromDisplayName: "chrome@test"
    })
    const parsed = parseFamilyInviteFileText(`  ${code}\n`)
    assert.equal(parsed.ok, true)
    if (!parsed.ok) {
      return
    }
    assert.equal(parsed.code, code)
  })

  it("rejects wrong kind and short codes", () => {
    assert.equal(
      parseFamilyInviteFileText(
        JSON.stringify({
          v: 1,
          kind: "other",
          code: "bmxt1.aaaaaaaaaaaaaaaa"
        })
      ).ok,
      false
    )
    assert.equal(buildFamilyInviteFileJson({ code: "bmxt1.short" }), null)
  })
})
