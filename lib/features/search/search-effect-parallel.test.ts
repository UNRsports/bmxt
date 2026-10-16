import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { isParallelSearchEffect } from "./search-effect-parallel.ts"

describe("isParallelSearchEffect", () => {
  it("marks history / bookmark / page / snapshot as parallel-safe", () => {
    assert.equal(isParallelSearchEffect({ kind: "search_history", pattern: "x" }), true)
    assert.equal(isParallelSearchEffect({ kind: "search_bookmark", pattern: "x" }), true)
    assert.equal(isParallelSearchEffect({ kind: "search_page", pattern: "x" }), true)
    assert.equal(isParallelSearchEffect({ kind: "search_snapshot", pattern: "x" }), true)
  })

  it("rejects non-search effects", () => {
    assert.equal(isParallelSearchEffect({ kind: "tabs_list" } as never), false)
  })
})
