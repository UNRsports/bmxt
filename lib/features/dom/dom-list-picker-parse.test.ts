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
      "--react",
      "--picker"
    ])
  })

  it("offers flavor, --tag, and --picker after --with is set", () => {
    assert.deepEqual(listDomListRemainingOptionCandidates(["--with"], ""), [
      "--html",
      "--react",
      "--tag",
      "--picker"
    ])
  })

  it("offers --tag and --picker after --with and flavor are set", () => {
    assert.deepEqual(listDomListRemainingOptionCandidates(["--with", "--html"], ""), [
      "--tag",
      "--picker"
    ])
  })

  it("offers only --picker when mode, flavor, and --tag are set", () => {
    assert.deepEqual(listDomListRemainingOptionCandidates(["--with", "--html", "--tag"], ""), [
      "--picker"
    ])
  })

  it("offers no options when --picker is already present with full options", () => {
    assert.deepEqual(
      listDomListRemainingOptionCandidates(["--with", "--html", "--tag", "--picker"], ""),
      []
    )
  })

  it("prefix-filters partial tokens", () => {
    assert.deepEqual(listDomListRemainingOptionCandidates([], "--h"), ["--html"])
    assert.deepEqual(listDomListRemainingOptionCandidates(["--with"], "--r"), ["--react"])
    assert.deepEqual(listDomListRemainingOptionCandidates(["--with", "--html"], "--t"), ["--tag"])
    assert.deepEqual(listDomListRemainingOptionCandidates(["--with", "--html"], "--p"), [
      "--picker"
    ])
  })
})

describe("isDomListAwaitingMoreOptionsAtEol", () => {
  it("detects trailing space with remaining options", () => {
    assert.equal(isDomListAwaitingMoreOptionsAtEol("dom -list "), true)
    assert.equal(isDomListAwaitingMoreOptionsAtEol("dom -list --with "), true)
    assert.equal(isDomListAwaitingMoreOptionsAtEol("dom -list --with --html "), true)
    assert.equal(isDomListAwaitingMoreOptionsAtEol("dom -list --with --html --tag "), true)
    assert.equal(
      isDomListAwaitingMoreOptionsAtEol("dom -list --with --html --tag --picker "),
      false
    )
  })
})

describe("matchesDomListOptionFilter", () => {
  it("matches partial option prefixes", () => {
    assert.equal(matchesDomListOptionFilter("--h"), true)
    assert.equal(matchesDomListOptionFilter("html"), true)
    assert.equal(matchesDomListOptionFilter("tag"), true)
    assert.equal(matchesDomListOptionFilter("picker"), true)
    assert.equal(matchesDomListOptionFilter("foo"), false)
  })
})
