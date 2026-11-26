import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  inferHostKindFromSender,
  resolveExitHostAction,
  resolveHostKindForExit
} from "../../../../shared/lib/features/bmxt-window/exit-host-policy.ts"

describe("resolveExitHostAction", () => {
  it("exits one session when multiple remain", () => {
    assert.deepEqual(
      resolveExitHostAction({ hostKind: "popup", sessionOrderLength: 2 }),
      { kind: "exitSession" }
    )
    assert.deepEqual(
      resolveExitHostAction({ hostKind: "popup", sessionOrderLength: 3, senderTabId: 9 }),
      { kind: "exitSession" }
    )
  })

  it("closes popup window on last popup session", () => {
    assert.deepEqual(
      resolveExitHostAction({ hostKind: "popup", sessionOrderLength: 1 }),
      { kind: "closePopupWindow" }
    )
    assert.deepEqual(
      resolveExitHostAction({ hostKind: "popup", sessionOrderLength: 0 }),
      { kind: "closePopupWindow" }
    )
  })
})

describe("inferHostKindFromSender", () => {
  it("always returns popup regardless of sender URL", () => {
    assert.equal(
      inferHostKindFromSender({
        url: "chrome-extension://abc/bmxt.html"
      } as chrome.runtime.MessageSender),
      "popup"
    )
    assert.equal(inferHostKindFromSender(undefined), "popup")
  })

  it("resolveHostKindForExit defaults to popup for unknown values", () => {
    assert.equal(resolveHostKindForExit("popup", undefined), "popup")
    assert.equal(resolveHostKindForExit(undefined, undefined), "popup")
    assert.equal(resolveHostKindForExit("float", undefined), "popup")
  })
})
