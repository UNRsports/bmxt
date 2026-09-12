import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  normalizeExtraKeysMode,
  resolveExtraKeysVisible
} from "./extra-keys-mode.ts"

describe("normalizeExtraKeysMode", () => {
  it("keeps known tokens and defaults missing/invalid to auto", () => {
    assert.equal(normalizeExtraKeysMode("auto"), "auto")
    assert.equal(normalizeExtraKeysMode("on"), "on")
    assert.equal(normalizeExtraKeysMode("off"), "off")
    assert.equal(normalizeExtraKeysMode(undefined), "auto")
    assert.equal(normalizeExtraKeysMode("maybe"), "auto")
    assert.equal(normalizeExtraKeysMode(1), "auto")
  })
})

describe("resolveExtraKeysVisible", () => {
  it("honors on/off and uses Android only in auto", () => {
    assert.equal(resolveExtraKeysVisible("on", false), true)
    assert.equal(resolveExtraKeysVisible("off", true), false)
    assert.equal(resolveExtraKeysVisible("auto", true), true)
    assert.equal(resolveExtraKeysVisible("auto", false), false)
  })
})
