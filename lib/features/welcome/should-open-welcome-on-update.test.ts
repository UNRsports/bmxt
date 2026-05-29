import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { shouldOpenWelcomePageOnUpdate } from "./should-open-welcome-on-update.ts"

describe("shouldOpenWelcomePageOnUpdate", () => {
  it("opens only on extension update to a not-yet-shown version", () => {
    assert.equal(
      shouldOpenWelcomePageOnUpdate("update", "0.3.8", undefined),
      true
    )
    assert.equal(
      shouldOpenWelcomePageOnUpdate("update", "0.3.8", "0.3.5"),
      true
    )
  })

  it("does not open on install or chrome_update", () => {
    assert.equal(
      shouldOpenWelcomePageOnUpdate("install", "0.3.8", undefined),
      false
    )
    assert.equal(
      shouldOpenWelcomePageOnUpdate("chrome_update", "0.3.8", undefined),
      false
    )
  })

  it("does not open when this version was already shown", () => {
    assert.equal(
      shouldOpenWelcomePageOnUpdate("update", "0.3.8", "0.3.8"),
      false
    )
  })
})
