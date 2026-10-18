import assert from "node:assert/strict"
import { afterEach, beforeEach, describe, it } from "node:test"
import { isTrustedBmxtUiSender } from "../../../../lib/features/extension-permissions/trusted-ui-sender.ts"

const EXT_ID = "abcdefghijklmnopqrstuvwxyzabcdef"

function installChromeRuntimeMock(id: string): void {
  const g = globalThis as typeof globalThis & { chrome?: { runtime: { id: string } } }
  g.chrome = { runtime: { id } }
}

describe("isTrustedBmxtUiSender", () => {
  beforeEach(() => {
    installChromeRuntimeMock(EXT_ID)
  })

  afterEach(() => {
    const g = globalThis as typeof globalThis & { chrome?: unknown }
    delete g.chrome
  })

  it("accepts bmxt.html from a windows.create popup tab (sender.tab present)", () => {
    const ok = isTrustedBmxtUiSender({
      id: EXT_ID,
      url: `chrome-extension://${EXT_ID}/bmxt.html`,
      tab: { id: 42 } as chrome.tabs.Tab
    })
    assert.equal(ok, true)
  })

  it("accepts bmxt-float.html iframe (query + sender.tab of host page)", () => {
    const ok = isTrustedBmxtUiSender({
      id: EXT_ID,
      url: `chrome-extension://${EXT_ID}/bmxt-float.html?tabId=7`,
      tab: { id: 7 } as chrome.tabs.Tab,
      frameId: 1
    })
    assert.equal(ok, true)
  })

  it("rejects content-script senders (https page url)", () => {
    const ok = isTrustedBmxtUiSender({
      id: EXT_ID,
      url: "https://example.com/page",
      tab: { id: 3 } as chrome.tabs.Tab,
      frameId: 0
    })
    assert.equal(ok, false)
  })

  it("rejects other extension ids", () => {
    const ok = isTrustedBmxtUiSender({
      id: "otherxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      url: `chrome-extension://${EXT_ID}/bmxt.html`
    })
    assert.equal(ok, false)
  })

  it("rejects non-allowlisted extension pages", () => {
    const ok = isTrustedBmxtUiSender({
      id: EXT_ID,
      url: `chrome-extension://${EXT_ID}/background-services.js`
    })
    assert.equal(ok, false)
  })

  it("rejects missing or unparseable urls", () => {
    assert.equal(isTrustedBmxtUiSender({ id: EXT_ID }), false)
    assert.equal(isTrustedBmxtUiSender({ id: EXT_ID, url: "" }), false)
    assert.equal(isTrustedBmxtUiSender({ id: EXT_ID, url: "not a url" }), false)
  })
})
