import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { compareLww, shouldAcceptLww } from "../../../../shared/lib/features/sync/payload/conflict-lww.ts"

describe("sync LWW", () => {
  it("prefers newer updatedAt", () => {
    const a = { updatedAt: "2026-01-01T00:00:00.000Z", deviceId: "b" }
    const b = { updatedAt: "2026-01-02T00:00:00.000Z", deviceId: "a" }
    assert.equal(compareLww(a, b), -1)
    assert.equal(shouldAcceptLww(a, b), true)
    assert.equal(shouldAcceptLww(b, a), false)
  })

  it("breaks ties with deviceId", () => {
    const a = { updatedAt: "2026-01-01T00:00:00.000Z", deviceId: "aaa" }
    const b = { updatedAt: "2026-01-01T00:00:00.000Z", deviceId: "bbb" }
    assert.equal(compareLww(a, b), -1)
    assert.equal(shouldAcceptLww(a, b), true)
  })

  it("accepts when current is null", () => {
    assert.equal(
      shouldAcceptLww(null, { updatedAt: "2026-01-01T00:00:00.000Z", deviceId: "x" }),
      true
    )
  })
})
