/**
 * EN: Unit tests — extension page URL / protocol helpers.
 * JA: 拡張ページ URL / プロトコルヘルパのユニットテスト。
 */

import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  BMXT_UI_PAGE_PATHS,
  extensionPageUrl,
  isExtensionPageProtocol,
  isSameExtensionAllowedPageUrl,
  normalizeExtensionPagePath,
  parseExtensionPageUrl,
  TRUSTED_BMXT_UI_PATHS
} from "../../../../lib/features/extension-url/extension-page-url.ts"

const EXT_ID = "abcdefghijklmnopqrstuvwxyzabcdef"

describe("extension-page-url", () => {
  it("recognizes chrome-extension and moz-extension protocols", () => {
    assert.equal(isExtensionPageProtocol("chrome-extension:"), true)
    assert.equal(isExtensionPageProtocol("moz-extension:"), true)
    assert.equal(isExtensionPageProtocol("https:"), false)
  })

  it("builds chrome-extension URLs by default (Chromium E2E)", () => {
    assert.equal(
      extensionPageUrl({ extensionId: EXT_ID, path: "shell" }),
      `chrome-extension://${EXT_ID}/bmxt.html`
    )
    assert.equal(
      extensionPageUrl({ extensionId: EXT_ID, path: "bmxt-float.html" }),
      `chrome-extension://${EXT_ID}/bmxt-float.html`
    )
  })

  it("builds moz-extension URLs when protocol is set", () => {
    assert.equal(
      extensionPageUrl({
        extensionId: EXT_ID,
        path: "shell",
        protocol: "moz-extension:"
      }),
      `moz-extension://${EXT_ID}/bmxt.html`
    )
  })

  it("parses both protocols and rejects https", () => {
    const chrome = parseExtensionPageUrl(`chrome-extension://${EXT_ID}/bmxt.html`)
    assert.deepEqual(chrome, {
      protocol: "chrome-extension:",
      extensionId: EXT_ID,
      pathname: "/bmxt.html"
    })
    const moz = parseExtensionPageUrl(`moz-extension://${EXT_ID}/bmxt-float.html?tabId=1`)
    assert.deepEqual(moz, {
      protocol: "moz-extension:",
      extensionId: EXT_ID,
      pathname: "/bmxt-float.html"
    })
    assert.equal(parseExtensionPageUrl("https://example.com/"), null)
  })

  it("normalizes paths with a leading slash", () => {
    assert.equal(normalizeExtensionPagePath("bmxt.html"), "/bmxt.html")
    assert.equal(normalizeExtensionPagePath("/bmxt.html?x=1"), "/bmxt.html")
    assert.equal(BMXT_UI_PAGE_PATHS.shell, "/bmxt.html")
  })

  it("allowlists trusted UI paths for both protocols", () => {
    assert.equal(
      isSameExtensionAllowedPageUrl(
        `chrome-extension://${EXT_ID}/bmxt.html`,
        EXT_ID,
        TRUSTED_BMXT_UI_PATHS
      ),
      true
    )
    assert.equal(
      isSameExtensionAllowedPageUrl(
        `moz-extension://${EXT_ID}/bmxt-float.html?tabId=9`,
        EXT_ID,
        TRUSTED_BMXT_UI_PATHS
      ),
      true
    )
    assert.equal(
      isSameExtensionAllowedPageUrl(
        `chrome-extension://${EXT_ID}/background-services.js`,
        EXT_ID,
        TRUSTED_BMXT_UI_PATHS
      ),
      false
    )
    assert.equal(
      isSameExtensionAllowedPageUrl(`chrome-extension://otherid/bmxt.html`, EXT_ID),
      false
    )
  })
})
