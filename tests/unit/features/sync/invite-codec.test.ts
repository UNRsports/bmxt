import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { formatInvite, parseInvite } from "../../../../shared/lib/features/sync/discovery/invite-codec.ts"
import { generateFamilySeed } from "../../../../shared/lib/features/sync/crypto/family-crypto.ts"
import type { SyncInviteV1 } from "../../../../shared/lib/features/sync/types.ts"

describe("sync invite codec", () => {
  it("round-trips invite tokens", () => {
    const { familyId, seedB64 } = generateFamilySeed()
    const invite: SyncInviteV1 = {
      version: 1,
      familyId,
      seedB64,
      fromDeviceId: "devABCDEF",
      fromDisplayName: "chrome@desk"
    }
    const token = formatInvite(invite)
    assert.ok(token.startsWith("bmxt1."))
    const parsed = parseInvite(token)
    assert.deepEqual(parsed, invite)
  })

  it("rejects garbage", () => {
    assert.equal(parseInvite(""), null)
    assert.equal(parseInvite("bmxt1.!!!"), null)
    assert.equal(parseInvite("not-an-invite"), null)
  })
})
