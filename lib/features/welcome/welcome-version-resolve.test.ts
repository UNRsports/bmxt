import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  WELCOME_VERSION_QUERY_PARAM,
  resolveWelcomeDisplayVersion
} from "./welcome-version-resolve.ts"

const KNOWN = ["0.3.5", "0.3.8"] as const

describe("resolveWelcomeDisplayVersion", () => {
  it("uses manifest version when query is absent", () => {
    assert.deepEqual(
      resolveWelcomeDisplayVersion(new URLSearchParams(), "0.3.8", KNOWN),
      { version: "0.3.8", fromUrlQuery: false }
    )
  })

  it("uses known version from ?version=", () => {
    const p = new URLSearchParams([[WELCOME_VERSION_QUERY_PARAM, "0.3.5"]])
    assert.deepEqual(resolveWelcomeDisplayVersion(p, "0.3.8", KNOWN), {
      version: "0.3.5",
      fromUrlQuery: true
    })
  })

  it("allows unknown version key for placeholder preview", () => {
    const p = new URLSearchParams([[WELCOME_VERSION_QUERY_PARAM, "9.9.9"]])
    assert.deepEqual(resolveWelcomeDisplayVersion(p, "0.3.8", KNOWN), {
      version: "9.9.9",
      fromUrlQuery: true
    })
  })

  it("rejects invalid version strings and falls back to manifest", () => {
    const p = new URLSearchParams([[WELCOME_VERSION_QUERY_PARAM, "not-a-version"]])
    assert.deepEqual(resolveWelcomeDisplayVersion(p, "0.3.8", KNOWN), {
      version: "0.3.8",
      fromUrlQuery: false
    })
  })

  it("trims whitespace around version param", () => {
    const p = new URLSearchParams([[WELCOME_VERSION_QUERY_PARAM, "  0.3.5  "]])
    assert.deepEqual(resolveWelcomeDisplayVersion(p, "0.3.8", KNOWN), {
      version: "0.3.5",
      fromUrlQuery: true
    })
  })
})
