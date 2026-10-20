import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  buildTabFaviconSrc,
  isTabFaviconPageUrl,
  manifestHasFaviconPermission,
  normalizeTabFavIconUrl,
  resolveTabFaviconSrc
} from "../../../../shared/lib/features/tabs/tab-favicon-url.ts"

describe("tab-favicon-url", () => {
  it("isTabFaviconPageUrl accepts http(s) only", () => {
    assert.equal(isTabFaviconPageUrl("https://example.com/path"), true)
    assert.equal(isTabFaviconPageUrl("http://localhost:8080/"), true)
    assert.equal(isTabFaviconPageUrl("chrome://newtab/"), false)
    assert.equal(isTabFaviconPageUrl("about:blank"), false)
    assert.equal(isTabFaviconPageUrl(""), false)
  })

  it("buildTabFaviconSrc uses extension _favicon endpoint", () => {
    const src = buildTabFaviconSrc(
      "https://example.com/a?q=1",
      (path) => `chrome-extension://test-id${path}`
    )
    assert.equal(
      src,
      "chrome-extension://test-id/_favicon/?pageUrl=https%3A%2F%2Fexample.com%2Fa%3Fq%3D1&size=16"
    )
    assert.equal(buildTabFaviconSrc("chrome://settings/", () => "x"), null)
  })

  it("normalizeTabFavIconUrl accepts safe schemes and rejects scriptable ones", () => {
    assert.equal(normalizeTabFavIconUrl("https://example.com/favicon.ico"), "https://example.com/favicon.ico")
    assert.equal(normalizeTabFavIconUrl("data:image/png;base64,abc"), "data:image/png;base64,abc")
    assert.equal(normalizeTabFavIconUrl("moz-anno:favicon:https://a/f.ico"), "moz-anno:favicon:https://a/f.ico")
    assert.equal(normalizeTabFavIconUrl("javascript:alert(1)"), null)
    assert.equal(normalizeTabFavIconUrl(""), null)
    assert.equal(normalizeTabFavIconUrl(undefined), null)
  })

  it("manifestHasFaviconPermission reads permission list", () => {
    assert.equal(manifestHasFaviconPermission(() => ["tabs", "favicon"]), true)
    assert.equal(manifestHasFaviconPermission(() => ["tabs"]), false)
    assert.equal(manifestHasFaviconPermission(() => undefined), false)
  })

  it("resolveTabFaviconSrc uses tab favIconUrl when favicon permission is absent", () => {
    const originalChrome = (globalThis as { chrome?: unknown }).chrome
    ;(globalThis as { chrome?: unknown }).chrome = {
      runtime: {
        getManifest: () => ({ permissions: ["tabs"] }),
        getURL: (path: string) => `chrome-extension://id${path}`
      }
    }
    try {
      assert.equal(
        resolveTabFaviconSrc("https://example.com/", "https://example.com/favicon.ico"),
        "https://example.com/favicon.ico"
      )
      assert.equal(resolveTabFaviconSrc("https://example.com/"), null)
    } finally {
      ;(globalThis as { chrome?: unknown }).chrome = originalChrome
    }
  })

  it("resolveTabFaviconSrc uses _favicon when favicon permission is present", () => {
    const originalChrome = (globalThis as { chrome?: unknown }).chrome
    ;(globalThis as { chrome?: unknown }).chrome = {
      runtime: {
        getManifest: () => ({ permissions: ["tabs", "favicon"] }),
        getURL: (path: string) => `chrome-extension://id${path}`
      }
    }
    try {
      assert.equal(
        resolveTabFaviconSrc("https://example.com/a", "https://ignored/favicon.ico"),
        "chrome-extension://id/_favicon/?pageUrl=https%3A%2F%2Fexample.com%2Fa&size=16"
      )
    } finally {
      ;(globalThis as { chrome?: unknown }).chrome = originalChrome
    }
  })
})
