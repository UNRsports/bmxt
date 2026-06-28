import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  bodyEntriesFromCapture,
  findDisplayIndexForPath,
  pathsEqual
} from "./dom-with-document-store.ts"

describe("dom-with-document-store", () => {
  it("compares paths for equality", () => {
    assert.equal(pathsEqual([0, 1, 2], [0, 1, 2]), true)
    assert.equal(pathsEqual([0, 1], [0, 1, 2]), false)
    assert.equal(pathsEqual(null, [0]), false)
  })

  it("finds display row index by path", () => {
    const capture = {
      headerLineCount: 2,
      lines: ["h1", "h2", "a", "b"],
      jumpPaths: [null, null, [0, 1], [0, 2]] as (readonly number[] | null)[]
    }
    assert.equal(findDisplayIndexForPath(capture, [0, 2]), 3)
    assert.equal(findDisplayIndexForPath(capture, [9]), -1)
  })

  it("extracts body entries from capture", () => {
    const capture = {
      headerLineCount: 1,
      lines: ["head", "link text"],
      jumpPaths: [null, [0, 0]] as (readonly number[] | null)[]
    }
    assert.deepEqual(bodyEntriesFromCapture(capture), [{ line: "link text", path: [0, 0] }])
  })
})
