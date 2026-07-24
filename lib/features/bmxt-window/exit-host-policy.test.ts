import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  inferHostKindFromSender,
  resolveExitHostAction,
  resolveHostKindForExit
} from "./exit-host-policy.ts"

describe("resolveExitHostAction", () => {
  it("exits one session when multiple remain", () => {
    assert.deepEqual(
      resolveExitHostAction({ hostKind: "popup", sessionOrderLength: 2 }),
      { kind: "exitSession" }
    )
    assert.deepEqual(
      resolveExitHostAction({ hostKind: "float", sessionOrderLength: 3, senderTabId: 9 }),
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

  it("hides float prompt on last float session without closing a browser window", () => {
    assert.deepEqual(
      resolveExitHostAction({ hostKind: "float", sessionOrderLength: 1, senderTabId: 42 }),
      { kind: "hideFloat", tabId: 42 }
    )
    assert.deepEqual(
      resolveExitHostAction({ hostKind: "float", sessionOrderLength: 1 }),
      { kind: "hideFloat", tabId: undefined }
    )
  })
})

describe("inferHostKindFromSender", () => {
  it("detects float iframe URL", () => {
    assert.equal(
      inferHostKindFromSender({
        url: "chrome-extension://abc/bmxt-float.html"
      } as chrome.runtime.MessageSender),
      "float"
    )
    assert.equal(
      inferHostKindFromSender({
        url: "chrome-extension://abc/bmxt.html"
      } as chrome.runtime.MessageSender),
      "popup"
    )
  })

  it("prefers explicit hostKind over sender", () => {
    assert.equal(
      resolveHostKindForExit("float", {
        url: "chrome-extension://abc/bmxt.html"
      } as chrome.runtime.MessageSender),
      "float"
    )
    assert.equal(resolveHostKindForExit(undefined, undefined), "popup")
  })
})
