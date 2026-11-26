import assert from "node:assert/strict"
import { before, describe, it } from "node:test"
import { ensureBmxtCoreForTests } from "../../../../../../shared/lib/features/bmxt-core/test-ensure-wasm.ts"
import {
  isMovePipeConsumer,
  parseMovePipeSegment
} from "../../../../../../shared/lib/features/command-line/pipe/consumers/move-match.ts"

before(() => {
  ensureBmxtCoreForTests()
})

describe("move pipe match", () => {
  it("parses window / before-tab / ungroup / as-group flags", () => {
    assert.deepEqual(parseMovePipeSegment("move --window 1"), {
      windowId: 1,
      groupId: -1,
      ungroup: false,
      beforeTabId: -1,
      asGroupIds: []
    })
    assert.deepEqual(parseMovePipeSegment("move --window 1 --before-tab 42"), {
      windowId: 1,
      groupId: -1,
      ungroup: false,
      beforeTabId: 42,
      asGroupIds: []
    })
    assert.deepEqual(parseMovePipeSegment("move --window 1 --as-group 10 --as-group 11"), {
      windowId: 1,
      groupId: -1,
      ungroup: false,
      beforeTabId: -1,
      asGroupIds: [10, 11]
    })
    assert.equal(isMovePipeConsumer("move --ungroup --group 1 --window 2"), false)
    assert.equal(isMovePipeConsumer("move --group 1 --window 2 --as-group 9"), false)
  })

  it("accepts Firefox tab group ids that exceed i32::MAX", () => {
    const flags = parseMovePipeSegment(
      "move --group 1795167899435072 --window 1 --before-tab 1"
    )
    assert.deepEqual(flags, {
      windowId: 1,
      groupId: 1_795_167_899_435_072,
      ungroup: false,
      beforeTabId: 1,
      asGroupIds: []
    })
    assert.equal(isMovePipeConsumer("move --group 1795167899435072 --window 1"), true)
  })
})
