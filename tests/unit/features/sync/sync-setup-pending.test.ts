import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  parseSyncSetupFamilyChoice,
  parseSyncSetupInvitePaste,
  parseSyncSetupRoleChoice,
  parseSyncSetupRtcPaste
} from "../../../../shared/lib/features/sync/setup/sync-setup-pending.ts"

describe("sync-setup-pending parsers", () => {
  it("parses family choices", () => {
    assert.equal(parseSyncSetupFamilyChoice("1", false), "create")
    assert.equal(parseSyncSetupFamilyChoice("join", false), "join")
    assert.equal(parseSyncSetupFamilyChoice("3", true), "continue")
    assert.equal(parseSyncSetupFamilyChoice("3", false), "invalid")
    assert.equal(parseSyncSetupFamilyChoice("cancel", true), "cancel")
  })

  it("parses role choices", () => {
    assert.equal(parseSyncSetupRoleChoice("offer"), "offer")
    assert.equal(parseSyncSetupRoleChoice("2"), "answer")
    assert.equal(parseSyncSetupRoleChoice("n"), "cancel")
    assert.equal(parseSyncSetupRoleChoice("x"), "invalid")
  })

  it("compacts pasted rtc codes", () => {
    const raw = "bmxt-rtc1.abcdef\n 0123456789extra"
    const parsed = parseSyncSetupRtcPaste(raw)
    assert.equal(parsed.kind, "value")
    if (parsed.kind === "value") {
      assert.equal(parsed.value, "bmxt-rtc1.abcdef0123456789extra")
    }
  })

  it("rejects short invite paste", () => {
    assert.equal(parseSyncSetupInvitePaste("bmxt1.short").kind, "invalid")
  })
})
