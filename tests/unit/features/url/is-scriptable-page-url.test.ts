import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  describeNonScriptableReason,
  isScriptablePageUrl
} from "../../../../lib/features/url/is-scriptable-page-url.ts"
import { isHttpUrl } from "../../../../lib/features/url/is-http-url.ts"

describe("isScriptablePageUrl (https-only in-page)", () => {
  it("accepts ordinary https pages", () => {
    assert.equal(isScriptablePageUrl("https://example.com/path"), true)
  })

  it("rejects plain http while isHttpUrl still accepts it", () => {
    assert.equal(isHttpUrl("http://example.com/"), true)
    assert.equal(isScriptablePageUrl("http://example.com/"), false)
    assert.match(describeNonScriptableReason("http://example.com/") ?? "", /http:/)
  })

  it("rejects chrome web store and non-http(s) schemes", () => {
    assert.equal(isScriptablePageUrl("https://chromewebstore.google.com/detail/x"), false)
    assert.equal(isScriptablePageUrl("chrome://settings"), false)
    assert.equal(isScriptablePageUrl(undefined), false)
  })
})
