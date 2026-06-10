import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { parseAppearanceResetConfirmAnswer } from "./parse-appearance-reset-confirm.ts"
import { parseHexColor } from "./validate-color.ts"
import { parseUiLocaleSettingToken, settingTokenForUiLocale } from "./locale.ts"
import { parseFontSizePx } from "./validate-size.ts"

describe("parseAppearanceResetConfirmAnswer", () => {
  it("accepts y and n", () => {
    assert.equal(parseAppearanceResetConfirmAnswer("y"), "yes")
    assert.equal(parseAppearanceResetConfirmAnswer("N"), "no")
  })

  it("rejects other input", () => {
    assert.equal(parseAppearanceResetConfirmAnswer("maybe"), "invalid")
  })
})

describe("parseHexColor", () => {
  it("accepts #rrggbb", () => {
    assert.equal(parseHexColor("#C9D1D9"), "#c9d1d9")
  })

  it("expands #rgb", () => {
    assert.equal(parseHexColor("#abc"), "#aabbcc")
  })

  it("rejects non-hex", () => {
    assert.equal(parseHexColor("red"), null)
    assert.equal(parseHexColor("#gggggg"), null)
  })
})

describe("locale setting tokens", () => {
  it("maps --japanese and --english", () => {
    assert.equal(parseUiLocaleSettingToken("--japanese"), "ja")
    assert.equal(parseUiLocaleSettingToken("--english"), "en")
    assert.equal(settingTokenForUiLocale("ja"), "--japanese")
    assert.equal(settingTokenForUiLocale("en"), "--english")
  })
})

describe("parseFontSizePx", () => {
  it("normalizes size", () => {
    assert.equal(parseFontSizePx("12"), "12px")
    assert.equal(parseFontSizePx("12px"), "12px")
    assert.equal(parseFontSizePx("40"), null)
  })
})
