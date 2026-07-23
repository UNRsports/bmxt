import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { formatNavConfirmCloseLockedPrefix } from "./nav-confirm-close.ts"

describe("formatNavConfirmCloseLockedPrefix", () => {
  it("appends a colon when missing", () => {
    assert.equal(
      formatNavConfirmCloseLockedPrefix("Close this tab? [y/n]"),
      "Close this tab? [y/n]:"
    )
  })

  it("does not double the colon", () => {
    assert.equal(
      formatNavConfirmCloseLockedPrefix("Close this tab? [y/n]:"),
      "Close this tab? [y/n]:"
    )
  })
})
