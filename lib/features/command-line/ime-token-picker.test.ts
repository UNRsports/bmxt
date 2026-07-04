import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  matchCandidates,
  matchesOptionTokenFilter,
  pickThirdTokenCandidates,
  resolveOptionTokenFilterModes
} from "./ime-token-match.ts"

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

const SEARCH_LIST_OPTIONS = [
  "--all",
  "--history",
  "--bookmark",
  "--page",
  "--snapshot",
  "--picker"
] as const

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

  it("keeps --picker while typing pi", () => {
    const { useFullCandidateList, filterMode } = resolveOptionTokenFilterModes(
      SEARCH_LIST_OPTIONS,
      "pi",
      "prefix"
    )
    assert.equal(useFullCandidateList, true)
    assert.equal(filterMode, "contains")
    assert.deepEqual(
      pickThirdTokenCandidates(
        SEARCH_LIST_OPTIONS,
        "pi",
        "prefix",
        useFullCandidateList,
        filterMode
      ),
      ["--picker"]
    )
  })

  it("narrows p to --page and --picker", () => {
    const { useFullCandidateList, filterMode } = resolveOptionTokenFilterModes(
      SEARCH_LIST_OPTIONS,
      "p",
      "prefix"
    )
    assert.deepEqual(
      pickThirdTokenCandidates(
        SEARCH_LIST_OPTIONS,
        "p",
        "prefix",
        useFullCandidateList,
        filterMode
      ),
      ["--page", "--picker"]
    )
  })
})

describe("matchesOptionTokenFilter", () => {
  it("matches option bodies and dashed prefixes", () => {
    assert.equal(matchesOptionTokenFilter(SEARCH_LIST_OPTIONS, "pi"), true)
    assert.equal(matchesOptionTokenFilter(SEARCH_LIST_OPTIONS, "--pi"), true)
    assert.equal(matchesOptionTokenFilter(SEARCH_LIST_OPTIONS, "zz"), false)
  })
})

describe("matchCandidates", () => {
  it("supports prefix and contains modes", () => {
    assert.deepEqual(matchCandidates(["-language", "-appearance"], "lang", "contains"), [
      "-language"
    ])
    assert.deepEqual(matchCandidates(["-language", "-appearance"], "-l", "prefix"), ["-language"])
  })

  it("matches option bodies in prefix mode", () => {
    assert.deepEqual(matchCandidates(["--picker", "--page"], "pi", "prefix"), ["--picker"])
  })
})

