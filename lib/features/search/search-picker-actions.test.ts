import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  listSearchPickerActions,
  searchPickerActionIsImmediate
} from "./search-picker-actions.ts"

describe("listSearchPickerActions", () => {
  it("lists reload and duplicate when tab is open", () => {
    assert.deepEqual(
      listSearchPickerActions({
        tabOpen: true,
        hasDetailHits: false,
        hlSearchPattern: ""
      }),
      ["reload", "duplicate"]
    )
  })

  it("adds detail and nohlsearch when applicable", () => {
    assert.deepEqual(
      listSearchPickerActions({
        tabOpen: true,
        hasDetailHits: true,
        hlSearchPattern: "foo"
      }),
      ["reload", "duplicate", "detail", "nohlsearch"]
    )
  })

  it("returns empty when tab is not open", () => {
    assert.deepEqual(
      listSearchPickerActions({
        tabOpen: false,
        hasDetailHits: true,
        hlSearchPattern: ""
      }),
      []
    )
  })
})

describe("searchPickerActionIsImmediate", () => {
  it("treats reload and duplicate as immediate", () => {
    assert.equal(searchPickerActionIsImmediate("reload"), true)
    assert.equal(searchPickerActionIsImmediate("duplicate"), true)
    assert.equal(searchPickerActionIsImmediate("detail"), false)
  })
})
