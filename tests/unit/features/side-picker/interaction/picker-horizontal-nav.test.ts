import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  pickerArrowLeft,
  pickerArrowRight
} from "../../../../../shared/lib/features/side-picker/interaction/picker-key-event.ts"
import { runPickerExitToDetailBar } from "../../../../../shared/lib/features/side-picker/interaction/picker-exit-to-detail-bar.ts"

function keyEvent(
  key: string,
  mods: Partial<Pick<KeyboardEvent, "ctrlKey" | "metaKey" | "altKey" | "shiftKey">> = {}
): KeyboardEvent {
  return {
    key,
    code: key,
    ctrlKey: mods.ctrlKey === true,
    metaKey: mods.metaKey === true,
    altKey: mods.altKey === true,
    shiftKey: mods.shiftKey === true,
    preventDefault() {},
    stopPropagation() {},
    stopImmediatePropagation() {}
  } as KeyboardEvent
}

describe("picker horizontal nav contract", () => {
  it("treats bare ← as back and bare → as forward", () => {
    assert.equal(pickerArrowLeft(keyEvent("ArrowLeft")), true)
    assert.equal(pickerArrowRight(keyEvent("ArrowRight")), true)
    assert.equal(pickerArrowLeft(keyEvent("ArrowRight")), false)
    assert.equal(pickerArrowRight(keyEvent("ArrowLeft")), false)
  })

  it("ignores modifier chords for horizontal nav", () => {
    assert.equal(pickerArrowLeft(keyEvent("ArrowLeft", { ctrlKey: true })), false)
    assert.equal(pickerArrowRight(keyEvent("ArrowRight", { altKey: true })), false)
  })

  it("exits to detail bar only on ← when canExit", () => {
    let exited = false
    const left = runPickerExitToDetailBar(
      keyEvent("ArrowLeft"),
      () => true,
      () => {
        exited = true
      }
    )
    assert.equal(left, true)
    assert.equal(exited, true)

    exited = false
    const right = runPickerExitToDetailBar(
      keyEvent("ArrowRight"),
      () => true,
      () => {
        exited = true
      }
    )
    assert.equal(right, false)
    assert.equal(exited, false)
  })
})
