import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { encodeTabRefInline, parseTabRefLogSegments } from "../command-line/tab-ref-log.ts"
import { rewriteHashTTokensForLog } from "./nav-tab-ref-log-rewrite.ts"
import type { NavReloadTabChipMeta } from "./nav-reload-tab-token.ts"

describe("rewriteHashTTokensForLog", () => {
  it("replaces #t:<id> with command-echo chip appearance", () => {
    const meta = new Map<number, NavReloadTabChipMeta>([
      [
        42,
        {
          title: "Docs",
          faviconSrc: "chrome-extension://x/_favicon/",
          label: "Docs"
        }
      ]
    ])
    const out = rewriteHashTTokensForLog("> nav -reload #t:42", meta, "Tab")
    assert.equal(out.includes("#t:"), false)
    assert.deepEqual(parseTabRefLogSegments(out), [
      { kind: "text", text: "> nav -reload " },
      {
        kind: "tabRef",
        meta: {
          title: "Docs",
          faviconSrc: "chrome-extension://x/_favicon/",
          appearance: "chip"
        }
      }
    ])
  })

  it("uses pending title when meta is missing", () => {
    const out = rewriteHashTTokensForLog("#t:99", new Map(), "Tab")
    assert.deepEqual(parseTabRefLogSegments(out), [
      {
        kind: "tabRef",
        meta: { title: "Tab", faviconSrc: null, appearance: "chip" }
      }
    ])
    assert.equal(
      encodeTabRefInline({ title: "Tab", faviconSrc: null, appearance: "chip" }),
      out
    )
  })
})
