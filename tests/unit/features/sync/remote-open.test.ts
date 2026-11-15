import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  sanitizeGroupColor,
  sanitizeGroupTitle,
  sanitizeRemoteOpenUrls
} from "../../../../shared/lib/features/sync/bus/remote-open-sanitize.ts"

describe("sync remote open sanitize", () => {
  it("keeps only http(s) urls and caps count", () => {
    const urls = sanitizeRemoteOpenUrls([
      "https://example.com/a",
      "javascript:alert(1)",
      "http://localhost:3000",
      "chrome://extensions",
      "https://example.com/b"
    ])
    assert.deepEqual(urls, ["https://example.com/a", "http://localhost:3000/", "https://example.com/b"])
  })

  it("rejects control characters in group title", () => {
    assert.equal(sanitizeGroupTitle("ok"), "ok")
    assert.equal(sanitizeGroupTitle("bad\ntitle"), null)
    assert.equal(sanitizeGroupTitle(""), null)
  })

  it("accepts only chrome.tabGroups.Color enum values", () => {
    assert.equal(sanitizeGroupColor("blue"), "blue")
    assert.equal(sanitizeGroupColor("orange"), "orange")
    assert.equal(sanitizeGroupColor("navy"), null)
    assert.equal(sanitizeGroupColor(null), null)
  })
})
