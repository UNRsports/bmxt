import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  isSessionSettingNameUiLine,
  isSessionSwitchByNameUiLine,
  isSessionSwitchUiLine,
  parseSessionListPickerLine,
  parseSessionSettingNameBareLine,
  parseSessionSettingNameWithLine,
  parseSessionSwitchPickerLine,
  parseSessionSwitchWithLine,
  parseSessionSwitchByNumberLine,
  resolveSessionSwitchPickerState
} from "./session-input.ts"

describe("parseSessionListPickerLine", () => {
  it("parseSessionListPickerLine", () => {
    assert.equal(parseSessionListPickerLine("session -list"), true)
    assert.equal(parseSessionListPickerLine("session"), false)
  })
})

describe("parseSessionSwitchByNumberLine", () => {
  it("parseSessionSwitchByNumberLine", () => {
    assert.equal(parseSessionSwitchByNumberLine("session 2"), 2)
    assert.equal(parseSessionSwitchByNumberLine("SESSION 12"), 12)
    assert.equal(parseSessionSwitchByNumberLine("session 0"), null)
    assert.equal(parseSessionSwitchByNumberLine("session -new"), null)
  })
})

describe("isSessionSwitchUiLine", () => {
  it("isSessionSwitchUiLine", () => {
    assert.equal(isSessionSwitchUiLine("session"), false)
    assert.equal(isSessionSwitchUiLine("session -list"), false)
    assert.equal(isSessionSwitchUiLine("session 3"), true)
    assert.equal(isSessionSwitchUiLine("session -new"), false)
  })
})

describe("parseSessionSwitchPickerLine", () => {
  it("matches bare -switch", () => {
    assert.equal(parseSessionSwitchPickerLine("session -switch"), true)
    assert.equal(parseSessionSwitchPickerLine("session -switch "), true)
    assert.equal(parseSessionSwitchPickerLine("session -list"), false)
  })
})

describe("resolveSessionSwitchPickerState", () => {
  it("matches bare -switch at end of line", () => {
    const line = "session -switch"
    assert.deepEqual(resolveSessionSwitchPickerState(line, line.length), { namePrefix: "" })
  })

  it("extracts partial name prefix while typing", () => {
    const line = "session -switch ta"
    assert.deepEqual(resolveSessionSwitchPickerState(line, line.length), { namePrefix: "ta" })
  })

  it("supports spaces in session names", () => {
    const line = "session -switch my work"
    assert.deepEqual(resolveSessionSwitchPickerState(line, line.length), { namePrefix: "my work" })
  })

  it("returns null before -switch is complete", () => {
    assert.equal(resolveSessionSwitchPickerState("session -sw", 11), null)
    assert.equal(resolveSessionSwitchPickerState("tabs -switch", 12), null)
  })
})

describe("parseSessionSwitchWithLine", () => {
  it("extracts trailing session name", () => {
    assert.equal(parseSessionSwitchWithLine("session -switch work"), "work")
    assert.equal(parseSessionSwitchWithLine("session -switch my session"), "my session")
    assert.equal(parseSessionSwitchWithLine("session -switch"), null)
  })
})

describe("isSessionSwitchByNameUiLine", () => {
  it("covers bare and with-name lines", () => {
    assert.equal(isSessionSwitchByNameUiLine("session -switch"), true)
    assert.equal(isSessionSwitchByNameUiLine("session -switch foo"), true)
    assert.equal(isSessionSwitchByNameUiLine("session -list"), false)
  })
})

describe("parseSessionSettingNameBareLine", () => {
  it("matches bare -setting-name", () => {
    assert.equal(parseSessionSettingNameBareLine("session -setting-name"), true)
    assert.equal(parseSessionSettingNameBareLine("session -setting-name "), true)
    assert.equal(parseSessionSettingNameBareLine("session -new"), false)
  })
})

describe("parseSessionSettingNameWithLine", () => {
  it("extracts trailing name", () => {
    assert.equal(parseSessionSettingNameWithLine("session -setting-name work"), "work")
    assert.equal(parseSessionSettingNameWithLine("session -setting-name my session"), "my session")
    assert.equal(parseSessionSettingNameWithLine("session -setting-name"), null)
  })
})

describe("isSessionSettingNameUiLine", () => {
  it("covers bare and with-name lines", () => {
    assert.equal(isSessionSettingNameUiLine("session -setting-name"), true)
    assert.equal(isSessionSettingNameUiLine("session -setting-name foo"), true)
    assert.equal(isSessionSettingNameUiLine("session -list"), false)
  })
})
