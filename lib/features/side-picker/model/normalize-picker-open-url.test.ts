import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { normalizePickerOpenUrl } from "./normalize-picker-open-url.ts"

describe("normalizePickerOpenUrl", () => {
  it("accepts http(s) URLs", () => {
    assert.equal(normalizePickerOpenUrl("https://example.com/path"), "https://example.com/path")
    assert.equal(normalizePickerOpenUrl("http://localhost:8080"), "http://localhost:8080/")
  })

  it("adds https to bare hostnames", () => {
    assert.equal(normalizePickerOpenUrl("example.com"), "https://example.com/")
  })

  it("rejects non-http schemes", () => {
    assert.equal(normalizePickerOpenUrl("file:///etc/passwd"), undefined)
    assert.equal(normalizePickerOpenUrl("javascript:alert(1)"), undefined)
    assert.equal(normalizePickerOpenUrl("chrome://settings"), undefined)
    assert.equal(normalizePickerOpenUrl("chrome-extension://abc/page.html"), undefined)
  })

  it("returns undefined for empty input", () => {
    assert.equal(normalizePickerOpenUrl(""), undefined)
    assert.equal(normalizePickerOpenUrl("   "), undefined)
  })
})
