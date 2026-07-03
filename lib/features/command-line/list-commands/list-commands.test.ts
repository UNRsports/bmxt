import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  LIST_COMMAND_ENTRIES,
  matchPlainListCommand,
  segmentUsesListPicker
} from "./registry.ts"

describe("list-commands registry", () => {
  it("registers all five -list producers", () => {
    assert.deepEqual(
      LIST_COMMAND_ENTRIES.map((entry) => entry.id),
      ["tabs", "dom", "session", "setting", "search"]
    )
  })

  it("matchPlainListCommand accepts plain tabs -list", () => {
    const matched = matchPlainListCommand("tabs -list -u")
    assert.equal(matched?.entry.id, "tabs")
    assert.deepEqual(matched?.match, { showUrl: true })
  })

  it("matchPlainListCommand rejects picker segments", () => {
    assert.equal(matchPlainListCommand("tabs -list --picker"), null)
    assert.equal(segmentUsesListPicker("tabs -list --picker"), true)
  })

  it("records UI runtime for session and setting", () => {
    assert.equal(matchPlainListCommand("session -list")?.entry.runtime, "ui")
    assert.equal(matchPlainListCommand("setting -list")?.entry.runtime, "ui")
  })
})
