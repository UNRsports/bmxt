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
  "--snapshot"
] as const

/** EN: Same heads as `nav` second tokens (filter behavior under test). */
const NAV_SECOND_HEADS = ["-enter", "-exit", "-windowclose"] as const

/** EN: Tab-ops second tokens that moved from `nav` onto `tab`. */
const TAB_OPS_SECOND_HEADS = [
  "-back",
  "-forward",
  "-reload",
  "-close"
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

  it("keeps --page while typing pa", () => {
    const { useFullCandidateList, filterMode } = resolveOptionTokenFilterModes(
      SEARCH_LIST_OPTIONS,
      "pa",
      "prefix"
    )
    assert.equal(useFullCandidateList, true)
    assert.equal(filterMode, "contains")
    assert.deepEqual(
      pickThirdTokenCandidates(
        SEARCH_LIST_OPTIONS,
        "pa",
        "prefix",
        useFullCandidateList,
        filterMode
      ),
      ["--page"]
    )
  })

  it("narrows p to --page", () => {
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
      ["--page"]
    )
  })
})

describe("matchesOptionTokenFilter", () => {
  it("matches option bodies and dashed prefixes", () => {
    assert.equal(matchesOptionTokenFilter(SEARCH_LIST_OPTIONS, "pa"), true)
    assert.equal(matchesOptionTokenFilter(SEARCH_LIST_OPTIONS, "--pa"), true)
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
    assert.deepEqual(matchCandidates(["--page", "--all"], "pa", "prefix"), ["--page"])
  })
})

describe("nav second-token incremental filter (host full-list path)", () => {
  it("finds -windowclose from option bodies while menu is open", () => {
    const winHits = matchCandidates(NAV_SECOND_HEADS, "win", "contains")
    assert.deepEqual(winHits, ["-windowclose"])
  })
})

describe("tab ops second-token incremental filter (host full-list path)", () => {
  it("finds -reload from option bodies while menu is open", () => {
    const { useFullCandidateList, filterMode } = resolveOptionTokenFilterModes(
      TAB_OPS_SECOND_HEADS,
      "re",
      "contains"
    )
    assert.equal(useFullCandidateList, true)
    const reHits = matchCandidates(TAB_OPS_SECOND_HEADS, "re", filterMode)
    assert.ok(reHits.includes("-reload"))
  })

  it("finds -reload from dashed prefix", () => {
    assert.deepEqual(matchCandidates(TAB_OPS_SECOND_HEADS, "-re", "contains"), ["-reload"])
  })

  it("promotes full list for bare letter prefix so menu does not go empty", () => {
    const { useFullCandidateList, filterMode } = resolveOptionTokenFilterModes(
      TAB_OPS_SECOND_HEADS,
      "r",
      "prefix"
    )
    assert.equal(useFullCandidateList, true)
    const hits = matchCandidates(TAB_OPS_SECOND_HEADS, "r", filterMode)
    assert.ok(hits.includes("-reload"))
  })
})
