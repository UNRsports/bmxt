import assert from "node:assert/strict"
import { before, describe, it } from "node:test"
import { ensureBmxtCoreForTests } from "../../../../../../shared/lib/features/bmxt-core/test-ensure-wasm.ts"
import {
  isJumpPipeConsumer,
  JUMP_ACCEPTS_BMXT_RULE_KINDS
} from "../../../../../../shared/lib/features/command-line/pipe/consumers/jump-match.ts"
import {
  isOpenPipeConsumer,
  OPEN_ACCEPTS_BMXT_RULE_KINDS,
  parseOpenPipeSegment
} from "../../../../../../shared/lib/features/command-line/pipe/consumers/open-match.ts"
import { PIPE_CONSUMER_COMPLETION_IDS } from "../../../../../../shared/lib/features/command-line/pipe/consumers/completion-tokens.ts"

before(() => {
  ensureBmxtCoreForTests()
})

describe("open / jump pipe match (§7)", () => {
  it("matches bare open and destination flags", () => {
    assert.equal(isOpenPipeConsumer("open"), true)
    assert.deepEqual(parseOpenPipeSegment("open --window"), { mode: "new_window" })
    assert.deepEqual(parseOpenPipeSegment("open --into-window 3"), {
      mode: "into_window",
      windowId: 3
    })
    assert.deepEqual(parseOpenPipeSegment("open --into-group 5 --window-id 2"), {
      mode: "into_group",
      windowId: 2,
      groupId: 5
    })
    assert.equal(isOpenPipeConsumer("open https://x"), false)
    assert.ok(OPEN_ACCEPTS_BMXT_RULE_KINDS.includes("search.hit"))
  })

  it("matches bare jump", () => {
    assert.equal(isJumpPipeConsumer("jump"), true)
    assert.equal(isJumpPipeConsumer("jump --tab 1"), false)
    assert.ok(JUMP_ACCEPTS_BMXT_RULE_KINDS.includes("dom.node"))
  })

  it("registers open / jump / move / new-window in completion ids", () => {
    assert.ok(PIPE_CONSUMER_COMPLETION_IDS.includes("open"))
    assert.ok(PIPE_CONSUMER_COMPLETION_IDS.includes("jump"))
    assert.ok(PIPE_CONSUMER_COMPLETION_IDS.includes("move"))
    assert.ok(PIPE_CONSUMER_COMPLETION_IDS.includes("new-window"))
  })
})

