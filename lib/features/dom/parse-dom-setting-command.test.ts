import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { parseDomSettingCommandLine } from "./parse-dom-setting-command.ts"

describe("parseDomSettingCommandLine", () => {
  it("returns null for non-dom commands", () => {
    assert.equal(parseDomSettingCommandLine("tab -setting"), null)
  })

  it("parses incomplete dom", () => {
    assert.deepEqual(parseDomSettingCommandLine("dom"), { kind: "incomplete" })
  })

  it("parses setting-incomplete", () => {
    assert.deepEqual(parseDomSettingCommandLine("dom -setting"), { kind: "setting-incomplete" })
  })

  it("parses page-active-incomplete", () => {
    assert.deepEqual(parseDomSettingCommandLine("dom -setting -page-active"), {
      kind: "page-active-incomplete"
    })
  })

  it("parses page-active mode tokens", () => {
    assert.deepEqual(parseDomSettingCommandLine("dom -setting -page-active --auto"), {
      kind: "page-active",
      mode: "auto"
    })
    assert.deepEqual(parseDomSettingCommandLine("dom -setting -page-active --manual"), {
      kind: "page-active",
      mode: "manual"
    })
  })

  it("rejects unknown tokens", () => {
    assert.equal(parseDomSettingCommandLine("dom -setting -page-active --bogus"), null)
    assert.equal(parseDomSettingCommandLine("dom -list"), null)
  })
})
