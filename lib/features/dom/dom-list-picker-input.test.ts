import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { isDomListPermissionPromptOutput } from "./dom-list-prompt-eligibility.ts"
import { OPTIONAL_HOST_DENIED_LINES } from "../extension-permissions/optional-http-hosts.ts"

describe("isDomListPermissionPromptOutput", () => {
  it("is true only for optional host permission denial", () => {
    assert.equal(isDomListPermissionPromptOutput([...OPTIONAL_HOST_DENIED_LINES]), true)
  })

  it("is false for non-scriptable page notice", () => {
    assert.equal(
      isDomListPermissionPromptOutput([
        "dom -list — 表示不可",
        "JA: 権限のないページのため、本拡張機能では DOM を表示できません。"
      ]),
      false
    )
  })

  it("is false for legacy error: prefix lines", () => {
    assert.equal(
      isDomListPermissionPromptOutput([
        "error: dom -list cannot inject into this page (Chrome restricts scripting here)."
      ]),
      false
    )
  })
})
