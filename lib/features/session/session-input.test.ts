import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  isSessionSwitchUiLine,
  parseSessionListPickerLine,
  parseSessionSwitchByNumberLine
} from "./session-input.ts"

describe("session-input", () => {
  it("parseSessionListPickerLine", () => {
    assert.equal(parseSessionListPickerLine("session -list"), true)
    assert.equal(parseSessionListPickerLine("session"), false)
  })

  it("parseSessionSwitchByNumberLine", () => {
    assert.equal(parseSessionSwitchByNumberLine("session 2"), 2)
    assert.equal(parseSessionSwitchByNumberLine("SESSION 12"), 12)
    assert.equal(parseSessionSwitchByNumberLine("session 0"), null)
    assert.equal(parseSessionSwitchByNumberLine("session -new"), null)
  })

  it("isSessionSwitchUiLine", () => {
    assert.equal(isSessionSwitchUiLine("session"), false)
    assert.equal(isSessionSwitchUiLine("session -list"), false)
    assert.equal(isSessionSwitchUiLine("session 3"), true)
    assert.equal(isSessionSwitchUiLine("session -new"), false)
  })
})
