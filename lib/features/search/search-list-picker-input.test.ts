import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  isSearchListAllScopeToken,
  isSearchListReadyToRun,
  isSearchListScopeToken,
  matchesSearchListOptionFilter,
  normalizeSearchListDispatchLine,
  searchListEffectScopesForToken,
  searchListPatternFromLine,
  shouldShowSearchListPatternPlaceholder
} from "./search-list-picker-parse.ts"

describe("isSearchListReadyToRun", () => {
  it("allows scope-only dispatch with empty pattern", () => {
    assert.equal(isSearchListReadyToRun("search -list --history"), true)
    assert.equal(isSearchListReadyToRun("search -list --bookmark"), true)
    assert.equal(isSearchListReadyToRun("search -list --page"), true)
    assert.equal(isSearchListReadyToRun("search -list --snapshot"), true)
    assert.equal(isSearchListReadyToRun("search -list --all"), true)
  })

  it("allows scope with trailing pattern", () => {
    assert.equal(isSearchListReadyToRun("search -list --history github"), true)
    assert.equal(searchListPatternFromLine("search -list --history github"), "github")
    assert.equal(isSearchListReadyToRun("search -list --all docs"), true)
    assert.equal(searchListPatternFromLine("search -list --all docs"), "docs")
  })

  it("requires trailing space for scope-less search -list continuation", () => {
    assert.equal(isSearchListReadyToRun("search -list"), false)
    assert.equal(isSearchListReadyToRun("search -list", "search -list "), true)
  })

  it("blocks partial scope tokens", () => {
    assert.equal(isSearchListReadyToRun("search -list --hist"), false)
    assert.equal(isSearchListReadyToRun("search -list pa"), false)
  })

  it("allows pattern-only cross-scope line", () => {
    assert.equal(isSearchListReadyToRun("search -list github"), true)
  })
})

describe("searchListEffectScopesForToken", () => {
  it("expands --all to all effect scopes", () => {
    assert.deepEqual(searchListEffectScopesForToken("--all"), [
      "--history",
      "--bookmark",
      "--page",
      "--snapshot"
    ])
  })

  it("keeps single-scope tokens", () => {
    assert.deepEqual(searchListEffectScopesForToken("--history"), ["--history"])
  })
})

describe("normalizeSearchListDispatchLine", () => {
  it("rewrites bare search -list to --all", () => {
    assert.equal(normalizeSearchListDispatchLine("search -list"), "search -list --all")
  })

  it("passes through scoped lines", () => {
    assert.equal(
      normalizeSearchListDispatchLine("search -list --page foo"),
      "search -list --page foo"
    )
  })
})

describe("isSearchListScopeToken", () => {
  it("includes --all", () => {
    assert.equal(isSearchListScopeToken("--all"), true)
    assert.equal(isSearchListAllScopeToken("--ALL"), true)
  })
})

describe("matchesSearchListOptionFilter", () => {
  it("includes scope partials", () => {
    assert.equal(matchesSearchListOptionFilter("p"), true)
    assert.equal(matchesSearchListOptionFilter("pa"), true)
    assert.equal(matchesSearchListOptionFilter("--pa"), true)
    assert.equal(matchesSearchListOptionFilter("zz"), false)
  })
})

describe("shouldShowSearchListPatternPlaceholder", () => {
  it("suppresses pattern placeholder while typing a scope partial", () => {
    assert.equal(shouldShowSearchListPatternPlaceholder("search -list pa", 14), false)
    assert.equal(shouldShowSearchListPatternPlaceholder("search -list p", 13), false)
  })

  it("shows pattern placeholder for non-option text", () => {
    assert.equal(shouldShowSearchListPatternPlaceholder("search -list github", 19), true)
  })
})

describe("isSearchListReadyToRun option partials", () => {
  it("blocks partial scopes", () => {
    assert.equal(isSearchListReadyToRun("search -list pa"), false)
    assert.equal(isSearchListReadyToRun("search -list --pag"), false)
  })
})
