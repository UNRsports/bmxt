import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  encodeTabRefInline,
  logLineHasTabRef,
  parseTabRefLogSegments
} from "./tab-ref-log.ts"

describe("encodeTabRefInline / parseTabRefLogSegments", () => {
  it("round-trips a single plain chip inside a message", () => {
    const chip = encodeTabRefInline({
      title: "Example",
      faviconSrc: "chrome-extension://x/_favicon/?pageUrl=https%3A%2F%2Fe.example%2F",
      appearance: "plain"
    })
    const line = `reloaded ${chip}`
    assert.equal(logLineHasTabRef(line), true)
    assert.deepEqual(parseTabRefLogSegments(line), [
      { kind: "text", text: "reloaded " },
      {
        kind: "tabRef",
        meta: {
          title: "Example",
          faviconSrc: "chrome-extension://x/_favicon/?pageUrl=https%3A%2F%2Fe.example%2F",
          appearance: "plain"
        }
      }
    ])
  })

  it("round-trips a plain tab-only result line", () => {
    const chip = encodeTabRefInline({
      title: "ドキュメント",
      faviconSrc: null,
      appearance: "plain"
    })
    assert.deepEqual(parseTabRefLogSegments(chip), [
      { kind: "tabRef", meta: { title: "ドキュメント", faviconSrc: null, appearance: "plain" } }
    ])
  })

  it("defaults missing appearance to plain", () => {
    const legacy = `\u001ftab-ref:${JSON.stringify({ title: "X", faviconSrc: null })}\u001f`
    assert.deepEqual(parseTabRefLogSegments(legacy), [
      { kind: "tabRef", meta: { title: "X", faviconSrc: null, appearance: "plain" } }
    ])
  })

  it("leaves plain lines unchanged", () => {
    assert.equal(logLineHasTabRef("hello"), false)
    assert.deepEqual(parseTabRefLogSegments("hello"), [{ kind: "text", text: "hello" }])
  })

  it("treats truncated markers as plain text", () => {
    const broken = "\u001ftab-ref:{\"title\":\"x\""
    assert.deepEqual(parseTabRefLogSegments(broken), [{ kind: "text", text: broken }])
  })
})
