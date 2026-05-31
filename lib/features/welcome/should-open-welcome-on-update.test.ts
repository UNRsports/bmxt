import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { shouldOpenWelcomePageOnUpdate } from "./should-open-welcome-on-update.ts"

describe("shouldOpenWelcomePageOnUpdate", () => {
  it("opens on install or update when this version was not yet shown", () => {
    assert.equal(
      shouldOpenWelcomePageOnUpdate("install", "0.3.8", undefined),
      true
    )
    assert.equal(
      shouldOpenWelcomePageOnUpdate("update", "0.3.8", undefined),
      true
    )
    assert.equal(
      shouldOpenWelcomePageOnUpdate("update", "0.3.8", "0.3.5"),
      true
    )
  })

  it("does not open on chrome_update", () => {
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
