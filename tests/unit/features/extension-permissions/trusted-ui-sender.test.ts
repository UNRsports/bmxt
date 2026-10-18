import assert from "node:assert/strict"
import { afterEach, describe, it } from "node:test"
import { isTrustedBmxtUiSender } from "../../../../lib/features/extension-permissions/trusted-ui-sender.ts"

const EXT_ID = "abcdefghijklmnopqrstuvwxyzabcdef"

describe("isTrustedBmxtUiSender", () => {
  const previousChrome = globalThis.chrome

  afterEach(() => {
    globalThis.chrome = previousChrome
  })

  function installChromeMock(): void {
    globalThis.chrome = {
      runtime: { id: EXT_ID }
    } as typeof chrome
  }

  it("accepts bmxt.html and bmxt-float.html from this extension", () => {
    installChromeMock()
    assert.equal(
      isTrustedBmxtUiSender({
        id: EXT_ID,
        url: `chrome-extension://${EXT_ID}/bmxt.html`
      }),
      true
    )
    assert.equal(
      isTrustedBmxtUiSender({
        id: EXT_ID,
        url: `chrome-extension://${EXT_ID}/bmxt-float.html?tabId=1`
      }),
      true
    )
  })

  it("rejects content-script senders and foreign pages", () => {
    installChromeMock()
    assert.equal(
      isTrustedBmxtUiSender({
        id: EXT_ID,
        url: `chrome-extension://${EXT_ID}/bmxt.html`,
        tab: { id: 1 } as chrome.tabs.Tab
      }),
      false
    )
    assert.equal(
      isTrustedBmxtUiSender({
        id: "otheridotheridotheridotherido",
        url: `chrome-extension://otheridotheridotheridotherido/bmxt.html`
      }),
      false
    )
    assert.equal(
      isTrustedBmxtUiSender({
        id: EXT_ID,
        url: `chrome-extension://${EXT_ID}/background.js`
      }),
      false
    )
    assert.equal(isTrustedBmxtUiSender({ id: EXT_ID }), false)
  })
})
