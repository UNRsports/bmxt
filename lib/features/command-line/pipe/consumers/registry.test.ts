import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { LIST_OUTPUT_SCHEMA, type ListResult } from "../../list-output/types.ts"
import { CLOSE_ACCEPTS_KINDS, isClosePipeConsumer } from "./close-match.ts"
import { isPickerPipeConsumer, PICKER_ACCEPTS_KINDS } from "./picker-from-list.ts"
import { listResultAcceptsKinds } from "./list-result-accepts-kinds.ts"

function listResult(kinds: ListResult["records"][number]["kind"][]): ListResult {
  return {
    schema: LIST_OUTPUT_SCHEMA,
    command: "tabs",
    subcommand: "-list",
    records: kinds.map((kind) => ({ kind, fields: {} }))
  }
}

describe("isClosePipeConsumer", () => {
  it("matches close", () => {
    assert.equal(isClosePipeConsumer("close"), true)
    assert.equal(isClosePipeConsumer("c"), true)
  })

  it("rejects unknown consumers", () => {
    assert.equal(isClosePipeConsumer("group -new"), false)
  })
})

describe("isPickerPipeConsumer", () => {
  it("matches picker and picker -u", () => {
    assert.equal(isPickerPipeConsumer("picker"), true)
    assert.equal(isPickerPipeConsumer("picker -u"), true)
  })

  it("rejects unknown consumers", () => {
    assert.equal(isPickerPipeConsumer("close"), false)
  })

  it("accepts all list kinds", () => {
    assert.equal(
      listResultAcceptsKinds(listResult(["search.hit"]), PICKER_ACCEPTS_KINDS),
      true
    )
  })
})

describe("listResultAcceptsKinds", () => {
  it("accepts empty records", () => {
    assert.equal(listResultAcceptsKinds(listResult([]), CLOSE_ACCEPTS_KINDS), true)
  })

  it("accepts when at least one kind matches", () => {
    assert.equal(
      listResultAcceptsKinds(listResult(["tabs.window", "tabs.tab"]), CLOSE_ACCEPTS_KINDS),
      true
    )
  })

  it("rejects when no kind matches", () => {
    assert.equal(
      listResultAcceptsKinds(listResult(["session.row"]), CLOSE_ACCEPTS_KINDS),
      false
    )
  })
})
