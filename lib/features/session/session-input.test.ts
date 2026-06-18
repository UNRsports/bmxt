import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  isSessionSettingNameUiLine,
  isSessionSwitchUiLine,
  parseSessionListPickerLine,
  parseSessionSettingNameBareLine,
  parseSessionSettingNameWithLine,
  parseSessionSwitchByNumberLine
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
