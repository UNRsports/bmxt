import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { matchCandidates, pickThirdTokenCandidates } from "./ime-token-match.ts"

const SETTING_APPEARANCE_FLAGS = [
  "--fg",
  "--bg-color",
  "--size",
  "--font",
  "--bg-import",
  "--bg-clear",
  "--reset-default"
] as const

const TRANSLATE_SETTING_PAIRS = ["--ja-en", "--en-ja"] as const

describe("pickThirdTokenCandidates", () => {
  it("filters with contains while the picker menu is open", () => {
    assert.deepEqual(
      pickThirdTokenCandidates(SETTING_APPEARANCE_FLAGS, "re", "contains", true),
      ["--reset-default"]
    )
    assert.deepEqual(
      pickThirdTokenCandidates(TRANSLATE_SETTING_PAIRS, "ja-en", "contains", true),
      ["--ja-en"]
    )
  })

  it("prefix-filters when the menu is not open yet", () => {
    assert.deepEqual(
      pickThirdTokenCandidates(SETTING_APPEARANCE_FLAGS, "--re", "prefix", false),
      ["--reset-default"]
    )
  })

  it("returns empty when prefix does not match", () => {
    assert.deepEqual(
      pickThirdTokenCandidates(SETTING_APPEARANCE_FLAGS, "zz", "contains", true),
      []
    )
  })
})

describe("matchCandidates", () => {
  it("supports prefix and contains modes", () => {
    assert.deepEqual(matchCandidates(["-language", "-appearance"], "lang", "contains"), [
      "-language"
    ])
    assert.deepEqual(matchCandidates(["-language", "-appearance"], "-l", "prefix"), ["-language"])
  })
})
