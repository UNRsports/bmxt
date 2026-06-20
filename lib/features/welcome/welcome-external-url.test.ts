import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  buildWelcomePageUrl,
  isValidWelcomeVersionParam
} from "./welcome-external-url.ts"

describe("isValidWelcomeVersionParam", () => {
  it("accepts dotted numeric versions", () => {
    assert.equal(isValidWelcomeVersionParam("0.6.0"), true)
    assert.equal(isValidWelcomeVersionParam("  1.2.3  "), true)
  })

  it("rejects invalid version strings", () => {
    assert.equal(isValidWelcomeVersionParam(""), false)
    assert.equal(isValidWelcomeVersionParam("not-a-version"), false)
    assert.equal(isValidWelcomeVersionParam("0.6.0-beta"), false)
  })
})

describe("buildWelcomePageUrl", () => {
  it("sets lang and manifest version query params", () => {
    assert.equal(
      buildWelcomePageUrl("ja", "0.6.0"),
      "https://unrsports.github.io/bmxt/welcome.html?lang=ja&v=0.6.0"
    )
    assert.equal(
      buildWelcomePageUrl("en", "0.5.3"),
      "https://unrsports.github.io/bmxt/welcome.html?lang=en&v=0.5.3"
    )
  })

  it("omits v when manifest version is invalid", () => {
    assert.equal(
      buildWelcomePageUrl("ja", "bad"),
      "https://unrsports.github.io/bmxt/welcome.html?lang=ja"
    )
  })
})
