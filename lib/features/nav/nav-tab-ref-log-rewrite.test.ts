import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { parseTabRefLogSegments } from "../command-line/tab-ref-log.ts"
import { rewriteHashTTokensForLog } from "./nav-tab-ref-log-rewrite.ts"
import type { NavReloadTabChipMeta } from "./nav-reload-tab-token.ts"

describe("rewriteHashTTokensForLog", () => {
  it("rewrites chip-only echo as tab: + chip (no wire id)", () => {
    const meta = new Map<number, NavReloadTabChipMeta>([
      [
        42,
        {
          title: "Docs",
          faviconSrc: "chrome-extension://x/_favicon/",
          label: "Docs",
          url: "https://docs.example/"
        }
      ]
    ])
    const out = rewriteHashTTokensForLog("> #t:42", meta, "Tab")
    assert.equal(out.includes("#t:"), false)
    assert.deepEqual(parseTabRefLogSegments(out), [
      { kind: "text", text: "> tab: " },
      {
        kind: "tabRef",
        meta: {
          title: "Docs",
          faviconSrc: "chrome-extension://x/_favicon/",
          appearance: "chip",
          url: null
        }
      }
    ])
  })

  it("keeps tab:: prefix and includes url on chips", () => {
    const meta = new Map<number, NavReloadTabChipMeta>([
      [
        7,
        {
          title: "GitHub",
          faviconSrc: null,
          label: "GitHub",
          url: "https://github.com/x"
        }
      ]
    ])
    const out = rewriteHashTTokensForLog("> tab:: #t:7", meta, "Tab")
    assert.equal(out.includes("#t:"), false)
    assert.deepEqual(parseTabRefLogSegments(out), [
      { kind: "text", text: "> tab:: " },
      {
        kind: "tabRef",
        meta: {
          title: "GitHub",
          faviconSrc: null,
          appearance: "chip",
          url: "https://github.com/x"
        }
      }
    ])
  })

  it("rewrites embedded #t:<id> without adding tab: prefix", () => {
    const meta = new Map<number, NavReloadTabChipMeta>([
      [
        42,
        {
          title: "Docs",
          faviconSrc: "chrome-extension://x/_favicon/",
          label: "Docs",
          url: "https://docs.example/"
        }
      ]
    ])
    const out = rewriteHashTTokensForLog("> reload #t:42", meta, "Tab")
    assert.equal(out.includes("#t:"), false)
    assert.deepEqual(parseTabRefLogSegments(out), [
      { kind: "text", text: "> reload " },
      {
        kind: "tabRef",
        meta: {
          title: "Docs",
          faviconSrc: "chrome-extension://x/_favicon/",
          appearance: "chip",
          url: null
        }
      }
    ])
  })

  it("uses pending title when meta is missing", () => {
    const out = rewriteHashTTokensForLog("#t:99", new Map(), "Tab")
    assert.equal(out.includes("#t:"), false)
    assert.deepEqual(parseTabRefLogSegments(out), [
      { kind: "text", text: "tab: " },
      {
        kind: "tabRef",
        meta: { title: "Tab", faviconSrc: null, appearance: "chip", url: null }
      }
    ])
  })
})
