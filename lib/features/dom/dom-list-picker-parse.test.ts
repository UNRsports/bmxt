import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  isDomListAwaitingMoreOptionsAtEol,
  listDomListRemainingOptionCandidates,
  matchesDomListOptionFilter
} from "./dom-list-picker-parse.ts"

describe("listDomListRemainingOptionCandidates", () => {
  it("offers all options after bare dom -list", () => {
    assert.deepEqual(listDomListRemainingOptionCandidates([], ""), [
      "--normal",
      "--with",
      "--html",
      "--react"
    ])
  })

  it("offers flavor after mode is set", () => {
    assert.deepEqual(listDomListRemainingOptionCandidates(["--with"], ""), [
      "--html",
      "--react"
    ])
  })

  it("offers no options when mode and flavor are set", () => {
    assert.deepEqual(listDomListRemainingOptionCandidates(["--with", "--html"], ""), [])
  })

  it("prefix-filters partial tokens", () => {
    assert.deepEqual(listDomListRemainingOptionCandidates([], "--h"), ["--html"])
    assert.deepEqual(listDomListRemainingOptionCandidates(["--with"], "--r"), ["--react"])
  })
})

describe("isDomListAwaitingMoreOptionsAtEol", () => {
  it("detects trailing space with remaining options", () => {
    assert.equal(isDomListAwaitingMoreOptionsAtEol("dom -list "), true)
    assert.equal(isDomListAwaitingMoreOptionsAtEol("dom -list --with "), true)
    assert.equal(isDomListAwaitingMoreOptionsAtEol("dom -list --with --html "), false)
  })
})

describe("matchesDomListOptionFilter", () => {
  it("matches partial option prefixes", () => {
    assert.equal(matchesDomListOptionFilter("--h"), true)
    assert.equal(matchesDomListOptionFilter("html"), true)
    assert.equal(matchesDomListOptionFilter("foo"), false)
  })
})
