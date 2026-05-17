import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { pickerEntriesFromFindLines } from "./from-find-lines.ts"

describe("pickerEntriesFromFindLines", () => {
  it("parses a history block", () => {
    const entries = pickerEntriesFromFindLines([
      "[history]",
      "title: Example",
      "url: https://example.com",
      ""
    ])
    assert.equal(entries.length, 1)
    assert.equal(entries[0]!.url, "https://example.com")
    assert.equal(entries[0]!.title, "Example")
    assert.equal(entries[0]!.source, "history")
  })

  it("skips blocks without http(s) url", () => {
    const entries = pickerEntriesFromFindLines([
      "[bookmark]",
      "title: No URL",
      ""
    ])
    assert.equal(entries.length, 0)
  })

  it("parses [none] as history source", () => {
    const entries = pickerEntriesFromFindLines([
      "[none]",
      "title: T",
      "url: https://t.example/",
      ""
    ])
    assert.equal(entries.length, 1)
    assert.equal(entries[0]!.source, "history")
  })
})
