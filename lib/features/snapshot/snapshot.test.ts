import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { buildSnapshotFileName, uniquifySnapshotFileName } from "./snapshot-filename.ts"
import {
  buildSnapshotMarkdown,
  parseSnapshotMarkdownMeta,
  snapshotMarkdownBodyLines
} from "./snapshot-markdown.ts"
import { parseSnapshotSaveLine } from "./snapshot-save-input.ts"

describe("buildSnapshotMarkdown", () => {
  it("includes frontmatter and heading", () => {
    const md = buildSnapshotMarkdown(
      { title: "Hello", url: "https://example.com/a", bodyText: "Body line" },
      "2025-06-25T00:00:00.000Z"
    )
    assert.match(md, /^---\n/)
    assert.match(md, /title: "Hello"/)
    assert.match(md, /url: "https:\/\/example.com\/a"/)
    assert.match(md, /# Hello/)
    assert.match(md, /Body line/)
  })
})

describe("parseSnapshotMarkdownMeta", () => {
  it("reads yaml frontmatter fields", () => {
    const md = buildSnapshotMarkdown(
      { title: "T", url: "https://x.test", bodyText: "x" },
      "2025-01-02T03:04:05.000Z"
    )
    const meta = parseSnapshotMarkdownMeta(md)
    assert.equal(meta.title, "T")
    assert.equal(meta.url, "https://x.test")
    assert.equal(meta.savedAt, "2025-01-02T03:04:05.000Z")
  })
})

describe("snapshotMarkdownBodyLines", () => {
  it("strips frontmatter before splitting lines", () => {
    const md = buildSnapshotMarkdown(
      { title: "T", url: "https://x.test", bodyText: "alpha\nbeta" },
      "2025-01-02T03:04:05.000Z"
    )
    const lines = snapshotMarkdownBodyLines(md)
    const joined = lines.join("\n")
    assert.match(joined, /alpha/)
    assert.match(joined, /beta/)
    assert.doesNotMatch(joined, /^---/)
  })
})

describe("buildSnapshotFileName", () => {
  it("builds dated slug file name", () => {
    const name = buildSnapshotFileName(
      "Example Page",
      "https://example.com/x",
      "2025-06-25T12:00:00.000Z"
    )
    assert.equal(name, "2025-06-25-example-page.md")
  })
})

describe("uniquifySnapshotFileName", () => {
  it("appends numeric suffix on collision", () => {
    const taken = new Set(["2025-06-25-page.md"])
    assert.equal(
      uniquifySnapshotFileName("2025-06-25-page.md", taken),
      "2025-06-25-page-2.md"
    )
  })
})

describe("parseSnapshotSaveLine", () => {
  it("accepts snapshot -save and optional tab id", () => {
    assert.deepEqual(parseSnapshotSaveLine("snapshot -save"), {})
    assert.deepEqual(parseSnapshotSaveLine("snapshot -save 42"), { tabId: "42" })
    assert.equal(parseSnapshotSaveLine("snapshot -list"), null)
  })
})
