import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  matchesFloatLaunchAuth,
  parentOriginFromTabUrl
} from "./float-launch-auth.ts"

describe("float-launch-auth helpers", () => {
  it("parses http(s) origins from tab URLs", () => {
    assert.equal(parentOriginFromTabUrl("https://example.com/path?q=1"), "https://example.com")
    assert.equal(parentOriginFromTabUrl("http://localhost:3000/"), "http://localhost:3000")
    assert.equal(parentOriginFromTabUrl("chrome://extensions"), null)
    assert.equal(parentOriginFromTabUrl(undefined), null)
  })

  it("accepts matching non-expired parent origins only", () => {
    const now = 1_000_000
    const entry = { parentOrigin: "https://example.com", exp: now + 60_000 }
    assert.equal(matchesFloatLaunchAuth(entry, "https://example.com", now), true)
    assert.equal(matchesFloatLaunchAuth(entry, "https://evil.example", now), false)
    assert.equal(matchesFloatLaunchAuth(entry, null, now), false)
    assert.equal(matchesFloatLaunchAuth(entry, "https://example.com", now + 120_000), false)
    assert.equal(matchesFloatLaunchAuth(null, "https://example.com", now), false)
  })
})
