import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { buildTabFaviconSrc, isTabFaviconPageUrl } from "./tab-favicon-url.ts"

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
})
