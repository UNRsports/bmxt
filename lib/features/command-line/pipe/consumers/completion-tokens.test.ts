import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  listPipeConsumerCompletionTokens,
  PIPE_CONSUMER_COMPLETION_IDS
} from "./completion-tokens.ts"

describe("listPipeConsumerCompletionTokens", () => {
  it("lists consumer ids and close alias c", () => {
    const tokens = listPipeConsumerCompletionTokens()
    for (const id of PIPE_CONSUMER_COMPLETION_IDS) {
      assert.ok(tokens.includes(id), `missing ${id}`)
    }
    assert.ok(tokens.includes("c"))
  })
})
