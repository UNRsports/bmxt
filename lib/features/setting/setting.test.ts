import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { parseAppearanceResetConfirmAnswer } from "./parse-appearance-reset-confirm.ts"
import { parseHexColor } from "./validate-color.ts"
import { parseUiLocaleSettingToken, settingTokenForUiLocale } from "./locale.ts"
import { parseFontSizePx } from "./validate-size.ts"
import {
  parseSettingExitListLine,
  parseSettingIncompleteLine,
  parseSettingListPickerLine
} from "./setting-list-picker-input.ts"
import { buildZipArchive, parseZipArchive } from "./zip-store.ts"

const SETTINGS_JSON_NAME = "settings.json"

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

describe("setting list picker input", () => {
  it("parses -list and -exit -list", () => {
    assert.equal(parseSettingIncompleteLine("setting"), true)
    assert.equal(parseSettingListPickerLine("setting -list"), true)
    assert.equal(parseSettingExitListLine("setting -exit -list"), true)
    assert.equal(parseSettingListPickerLine("setting -language"), false)
  })
})

describe("zip store", () => {
  it("round-trips file entries", () => {
    const json = JSON.stringify({ version: 1, locale: "ja" })
    const zip = buildZipArchive([
      { name: SETTINGS_JSON_NAME, data: new TextEncoder().encode(json) },
      { name: "background-image.png", data: new Uint8Array([0x89, 0x50, 0x4e, 0x47]) }
    ])
    const entries = parseZipArchive(zip)
    assert.equal(entries.length, 2)
    assert.equal(entries[0]!.name, SETTINGS_JSON_NAME)
    assert.equal(new TextDecoder().decode(entries[0]!.data), json)
    assert.equal(entries[1]!.name, "background-image.png")
  })
})
