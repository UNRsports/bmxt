import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  pollSearchCancel,
  SEARCH_CANCEL_YIELD_EVERY
} from "../../../../shared/lib/features/search/cooperative-cancel.ts"

describe("pollSearchCancel", () => {
  it("returns true when the parent flag is already set", async () => {
    assert.equal(await pollSearchCancel(() => true, 0), true)
  })

  it("returns false when cancel is unset or false", async () => {
    assert.equal(await pollSearchCancel(undefined, 0), false)
    assert.equal(await pollSearchCancel(() => false, 0), false)
  })

  it("re-checks the parent flag after a macrotask yield", async () => {
    let checks = 0
    const shouldCancel = (): boolean => {
      checks += 1
      return checks >= 2
    }
    assert.equal(await pollSearchCancel(shouldCancel, SEARCH_CANCEL_YIELD_EVERY), true)
    assert.ok(checks >= 2)
  })
})
