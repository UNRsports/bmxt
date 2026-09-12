import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  normalizeHostUiMode,
  resolveExtraKeysVisible,
  resolveHostUiFormFactor
} from "./host-ui-mode.ts"

describe("normalizeHostUiMode", () => {
  it("keeps known tokens and defaults invalid to auto", () => {
    assert.equal(normalizeHostUiMode("auto"), "auto")
    assert.equal(normalizeHostUiMode("desktop"), "desktop")
    assert.equal(normalizeHostUiMode("mobile"), "mobile")
    assert.equal(normalizeHostUiMode(undefined), "auto")
    assert.equal(normalizeHostUiMode("maybe"), "auto")
  })

  it("migrates legacy extraKeysMode tokens", () => {
    assert.equal(normalizeHostUiMode("on"), "mobile")
    assert.equal(normalizeHostUiMode("off"), "desktop")
  })
})

describe("resolveHostUiFormFactor", () => {
  it("honors overrides and uses Android only in auto", () => {
    assert.equal(resolveHostUiFormFactor("mobile", false), "mobile")
    assert.equal(resolveHostUiFormFactor("desktop", true), "desktop")
    assert.equal(resolveHostUiFormFactor("auto", true), "mobile")
    assert.equal(resolveHostUiFormFactor("auto", false), "desktop")
  })
})

describe("resolveExtraKeysVisible", () => {
  it("follows effective mobile form factor", () => {
    assert.equal(resolveExtraKeysVisible("mobile", false), true)
    assert.equal(resolveExtraKeysVisible("desktop", true), false)
    assert.equal(resolveExtraKeysVisible("auto", true), true)
    assert.equal(resolveExtraKeysVisible("auto", false), false)
  })
})
