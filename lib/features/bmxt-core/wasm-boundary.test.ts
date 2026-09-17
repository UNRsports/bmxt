/**
 * EN: WASM boundary golden tests (TS host ↔ Rust). Runs after `build:wasm` and in `pnpm test`.
 * JA: WASM 境界ゴールデン（TS ホスト ↔ Rust）。`build:wasm` 後および `pnpm test` で実行。
 */

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { before, describe, it } from "node:test"
import { ensureBmxtCoreForTests } from "./test-ensure-wasm.ts"
import {
  wasmComplete,
  wasmParseCompound,
  wasmParsePipe,
  wasmPlanCompound,
  wasmRun
} from "./wasm-host.ts"
import { utf16OffsetToUtf8ByteOffset } from "./utf16-utf8-offset.ts"
import { complete as rawComplete } from "../../wasm/bmxt-core/bmxt_core.js"

const here = dirname(fileURLToPath(import.meta.url))
const effectsFixturePath = join(here, "../../../scripts/fixtures/dispatch/effects.json")

const CJK_LINE = "search -list --all リスト | browse"
const MIXED_LINE = "tab -list && echo '日本語' | browse"
const EMOJI_LINE = "search -list --all 🔍test | browse"

function parseBundleTy(raw: string): string {
  const parsed: unknown = JSON.parse(raw)
  if (parsed === null || typeof parsed !== "object") {
    throw new Error(`invalid dispatch JSON: ${raw}`)
  }
  const ty = (parsed as Record<string, unknown>).ty
  if (typeof ty !== "string") {
    throw new Error(`missing ty in dispatch JSON: ${raw}`)
  }
  return ty
}

function parseCompleteHit(raw: string): {
  tokenStart: number
  tokenEnd: number
  prefix: string
  candidates: string[]
  tier: string
} | null {
  if (raw === "null" || raw.length === 0) {
    return null
  }
  const parsed: unknown = JSON.parse(raw)
  if (parsed === null || typeof parsed !== "object") {
    return null
  }
  const o = parsed as Record<string, unknown>
  if (
    typeof o.tokenStart !== "number" ||
    typeof o.tokenEnd !== "number" ||
    typeof o.prefix !== "string" ||
    !Array.isArray(o.candidates) ||
    typeof o.tier !== "string"
  ) {
    throw new Error(`invalid complete hit JSON: ${raw}`)
  }
  return {
    tokenStart: o.tokenStart,
    tokenEnd: o.tokenEnd,
    prefix: o.prefix,
    candidates: o.candidates.filter((c): c is string => typeof c === "string"),
    tier: o.tier
  }
}

function assertHitOffsetsInUtf16Range(line: string, raw: string): void {
  const hit = parseCompleteHit(raw)
  if (hit === null) {
    return
  }
  assert.ok(hit.tokenStart >= 0 && hit.tokenStart <= line.length, `tokenStart ${hit.tokenStart}`)
  assert.ok(hit.tokenEnd >= hit.tokenStart && hit.tokenEnd <= line.length, `tokenEnd ${hit.tokenEnd}`)
  assert.equal(line.slice(hit.tokenStart, hit.tokenStart + hit.prefix.length), hit.prefix)
}

before(() => {
  ensureBmxtCoreForTests()
})

describe("WASM boundary — complete (UTF-16 cursor contract)", () => {
  it("survives every UTF-16 caret on a CJK search line", () => {
    for (let cursor = 0; cursor <= CJK_LINE.length; cursor += 1) {
      let raw: string
      try {
        raw = wasmComplete(CJK_LINE, cursor)
      } catch (e) {
        assert.fail(`wasmComplete threw at cursor=${cursor}: ${String(e)}`)
      }
      assertHitOffsetsInUtf16Range(CJK_LINE, raw)
    }
  })

  it("survives every UTF-16 caret on mixed compound / emoji lines", () => {
    for (const line of [MIXED_LINE, EMOJI_LINE]) {
      for (let cursor = 0; cursor <= line.length; cursor += 1) {
        const raw = wasmComplete(line, cursor)
        assertHitOffsetsInUtf16Range(line, raw)
      }
    }
  })

  it("returns ASCII first-token hits with UTF-16 offsets", () => {
    const line = "ta"
    const hit = parseCompleteHit(wasmComplete(line, 2))
    assert.ok(hit)
    assert.equal(hit.tier, "first")
    assert.ok(hit.candidates.includes("tab"))
    assert.equal(hit.tokenStart, 0)
    assert.equal(hit.tokenEnd, 2)
  })

  it("maps mid-CJK UTF-16 cursors without panicking (regression)", () => {
    const ri = CJK_LINE.indexOf("リ")
    assert.ok(ri >= 0)
    // EN: These UTF-16 indexes are mid-sequence if mistaken for UTF-8 bytes.
    for (const cursor of [ri + 1, ri + 2]) {
      const raw = wasmComplete(CJK_LINE, cursor)
      assert.equal(typeof raw, "string")
      assertHitOffsetsInUtf16Range(CJK_LINE, raw)
    }
  })

  it("documents that raw WASM complete must not receive UTF-16 indexes for CJK", () => {
    const ri = CJK_LINE.indexOf("リ")
    const midUtf16 = ri + 1
    const midAsUtf8Mistake = midUtf16
    const safeByte = utf16OffsetToUtf8ByteOffset(CJK_LINE, midUtf16)
    assert.notEqual(midAsUtf8Mistake, safeByte)
    // EN: Host path uses conversion — must succeed.
    assert.doesNotThrow(() => wasmComplete(CJK_LINE, midUtf16))
    // EN: Direct raw call with UTF-16 index is undefined; host must never do this.
    //     After Rust clamp, it may return null instead of panic — either is OK if host converts.
    const clamped = rawComplete(CJK_LINE, midAsUtf8Mistake)
    assert.equal(typeof clamped, "string")
  })
})

describe("WASM boundary — run / dispatch fixtures via TS host", () => {
  it("round-trips effects.json through wasmRun (pre-host normalize)", () => {
    const cases = JSON.parse(readFileSync(effectsFixturePath, "utf8")) as Array<{
      line: string
      expect: { ty: string }
    }>
    assert.ok(cases.length > 0)
    for (const c of cases) {
      const ty = parseBundleTy(wasmRun(c.line, "en"))
      assert.equal(ty, c.expect.ty, `line=${JSON.stringify(c.line)}`)
    }
  })

  it("wasmRun never throws on fixture lines", () => {
    const cases = JSON.parse(readFileSync(effectsFixturePath, "utf8")) as Array<{
      line: string
    }>
    for (const c of cases) {
      assert.doesNotThrow(() => wasmRun(c.line, "en"), c.line)
    }
  })

  it("parses wasmRun JSON for clear / tab -list", () => {
    assert.equal(parseBundleTy(wasmRun("clear", "en")), "effects")
    assert.equal(parseBundleTy(wasmRun("tab -list", "en")), "effects")
  })
})

describe("WASM boundary — compound / pipe with non-ASCII", () => {
  it("parses compound lines that embed CJK in quotes", () => {
    const raw = wasmParseCompound("tab -list && echo 'リスト'")
    const parsed: unknown = JSON.parse(raw)
    assert.ok(parsed !== null)
  })

  it("parses pipe lines with CJK pattern tokens", () => {
    const raw = wasmParsePipe(CJK_LINE)
    const parsed: unknown = JSON.parse(raw)
    assert.ok(parsed !== null)
  })

  it("plans compound without throwing on CJK", () => {
    const raw = wasmPlanCompound(MIXED_LINE)
    assert.equal(typeof raw, "string")
    assert.ok(raw.length > 0)
  })
})
