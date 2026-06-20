import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { buildWelcomePageUrl } from "./welcome-external-url.ts"

describe("buildWelcomePageUrl", () => {
  it("sets lang query from UI locale", () => {
    assert.equal(
      buildWelcomePageUrl("ja"),
      "https://unrsports.github.io/bmxt/welcome.html?lang=ja"
    )
    assert.equal(
      buildWelcomePageUrl("en"),
      "https://unrsports.github.io/bmxt/welcome.html?lang=en"
    )
  })
})
