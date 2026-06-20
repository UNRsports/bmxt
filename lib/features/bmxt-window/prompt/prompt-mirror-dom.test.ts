import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { paintPromptMirrorDom } from "./prompt-mirror-dom.ts"

function makeMirrorRefs(): {
  refs: import("./prompt-mirror-dom.ts").PromptMirrorDomRefs
  before: HTMLSpanElement
  composition: HTMLSpanElement
  cursor: HTMLSpanElement
  after: HTMLSpanElement
} {
  const before = document.createElement("span")
  const composition = document.createElement("span")
  composition.hidden = true
  const cursor = document.createElement("span")
  const after = document.createElement("span")
  return {
    refs: {
      beforeEl: before,
      compositionEl: composition,
      cursorCellEl: cursor,
      afterEl: after
    },
    before,
    composition,
    cursor,
    after
  }
}

describe("paintPromptMirrorDom", () => {
  it("paints normal cursor cell", () => {
    const { refs, before, composition, cursor, after } = makeMirrorRefs()
    paintPromptMirrorDom(refs, "hello", 2, false, 0, true)
    assert.equal(before.textContent, "he")
    assert.equal(cursor.textContent, "l")
    assert.equal(after.textContent, "lo")
    assert.equal(composition.hidden, true)
    assert.equal(cursor.hidden, false)
  })

  it("paints IME composition underline segment", () => {
    const { refs, before, composition, cursor, after } = makeMirrorRefs()
    paintPromptMirrorDom(refs, "preあい", 4, true, 3, true)
    assert.equal(before.textContent, "pre")
    assert.equal(composition.textContent, "あ")
    assert.equal(composition.hidden, false)
    assert.equal(cursor.hidden, true)
    assert.equal(after.textContent, "い")
  })
})
