import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  DEFAULT_TRANSLATION_PAIR_ID,
  getTranslationFieldLabels,
  pairIdFromSettingToken,
  parseTranslationPairId,
  settingTokenForPairId
} from "./translation-pair.ts"

describe("translation-pair", () => {
  it("maps setting tokens to pair ids", () => {
    assert.equal(pairIdFromSettingToken("--ja-en"), "ja-en")
    assert.equal(pairIdFromSettingToken("--EN-JA"), "en-ja")
    assert.equal(pairIdFromSettingToken("---ja-en"), null)
  })

  it("round-trips pair id to setting token", () => {
    assert.equal(settingTokenForPairId("ja-en"), "--ja-en")
    assert.equal(settingTokenForPairId("en-ja"), "--en-ja")
  })

  it("defaults unknown storage values", () => {
    assert.equal(parseTranslationPairId(undefined), DEFAULT_TRANSLATION_PAIR_ID)
    assert.equal(parseTranslationPairId("invalid"), DEFAULT_TRANSLATION_PAIR_ID)
    assert.equal(parseTranslationPairId("en-ja"), "en-ja")
  })

  it("builds field labels from pair direction", () => {
    const jaEn = getTranslationFieldLabels("ja-en")
    assert.equal(jaEn.source.ja, "原文（JA）")
    assert.equal(jaEn.source.en, "Source (Japanese)")
    assert.equal(jaEn.forward.ja, "訳（EN）")
    assert.equal(jaEn.forward.en, "Translation (English)")

    const enJa = getTranslationFieldLabels("en-ja")
    assert.equal(enJa.source.ja, "原文（EN）")
    assert.equal(enJa.forward.ja, "訳（JA）")
  })
})
