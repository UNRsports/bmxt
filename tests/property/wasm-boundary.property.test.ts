/**
 * EN: Property / random-input tests at the TS ↔ WASM host boundary.
 * JA: TS ↔ WASM ホスト境界のプロパティ／ランダム入力テスト。
 */

import assert from "node:assert/strict"
import { before, describe, it } from "node:test"
import * as fc from "fast-check"
import { ensureBmxtCoreForTests } from "../../shared/lib/features/bmxt-core/test-ensure-wasm.ts"
import {
  wasmClassify,
  wasmComplete,
  wasmParseCompound,
  wasmParsePipe,
  wasmPlanCompound,
  wasmRun
} from "../../shared/lib/features/bmxt-core/wasm-host.ts"

function isWellFormedUtf16(s: string): boolean {
  for (let i = 0; i < s.length; i += 1) {
    const c = s.charCodeAt(i)
    if (c >= 0xd800 && c <= 0xdbff) {
      if (i + 1 >= s.length) {
        return false
      }
      const low = s.charCodeAt(i + 1)
      if (low < 0xdc00 || low > 0xdfff) {
        return false
      }
      i += 1
      continue
    }
    if (c >= 0xdc00 && c <= 0xdfff) {
      return false
    }
  }
  return true
}

/** EN: Bounded lines — enough Unicode edge cases without timing out CI. */
const lineArb = fc
  .string({ minLength: 0, maxLength: 48 })
  .filter(isWellFormedUtf16)

const commandishLineArb = fc
  .tuple(
    fc.constantFrom(
      "",
      "tab ",
      "tab -list ",
      "search -list ",
      "search -list --all ",
      "clear",
      "help ",
      "setting -list ",
      "nav -enter ",
      "echo "
    ),
    lineArb
  )
  .map(([prefix, rest]) => `${prefix}${rest}`)
  .filter((s) => s.length <= 64)

const localeArb = fc.constantFrom("en", "ja", "en", "ja")

function assertJsonOrNullString(raw: string): void {
  assert.equal(typeof raw, "string")
  if (raw === "null" || raw.length === 0) {
    return
  }
  const parsed: unknown = JSON.parse(raw)
  assert.ok(parsed === null || typeof parsed === "object" || Array.isArray(parsed))
}

function assertCompleteHitUtf16Contract(line: string, raw: string): void {
  assert.equal(typeof raw, "string")
  if (raw === "null" || raw.length === 0) {
    return
  }
  const parsed: unknown = JSON.parse(raw)
  if (parsed === null) {
    return
  }
  assert.equal(typeof parsed, "object")
  const o = parsed as Record<string, unknown>
  assert.equal(typeof o.tokenStart, "number")
  assert.equal(typeof o.tokenEnd, "number")
  const tokenStart = o.tokenStart as number
  const tokenEnd = o.tokenEnd as number
  assert.ok(tokenStart >= 0 && tokenStart <= line.length)
  assert.ok(tokenEnd >= tokenStart && tokenEnd <= line.length)
  if (typeof o.prefix === "string" && o.prefix.length > 0) {
    assert.equal(line.slice(tokenStart, tokenStart + o.prefix.length), o.prefix)
  }
}

before(() => {
  ensureBmxtCoreForTests()
})

describe("WASM boundary — wasmComplete (property)", () => {
  it("never throws; hit offsets stay in UTF-16 range", () => {
    fc.assert(
      fc.property(lineArb, fc.integer({ min: -5, max: 80 }), (line, rawCursor) => {
        let raw: string
        try {
          raw = wasmComplete(line, rawCursor)
        } catch (e) {
          assert.fail(`wasmComplete threw: ${String(e)}`)
        }
        assertCompleteHitUtf16Contract(line, raw)
      }),
      { numRuns: 60 }
    )
  })

  it("survives command-like prefixes plus random Unicode tails", () => {
    fc.assert(
      fc.property(commandishLineArb, (line) => {
        for (const cursor of [0, Math.floor(line.length / 2), line.length]) {
          const raw = wasmComplete(line, cursor)
          assertCompleteHitUtf16Contract(line, raw)
        }
      }),
      { numRuns: 40 }
    )
  })
})

describe("WASM boundary — run / classify / parse / plan (property)", () => {
  it("wasmRun returns parseable JSON and does not throw", () => {
    fc.assert(
      fc.property(commandishLineArb, localeArb, (line, locale) => {
        let raw: string
        try {
          raw = wasmRun(line, locale)
        } catch (e) {
          assert.fail(`wasmRun threw on ${JSON.stringify(line)}: ${String(e)}`)
        }
        assertJsonOrNullString(raw)
        const parsed: unknown = JSON.parse(raw)
        assert.equal(typeof parsed, "object")
        assert.ok(parsed !== null)
        const ty = (parsed as Record<string, unknown>).ty
        assert.equal(typeof ty, "string")
      }),
      { numRuns: 40 }
    )
  })

  it("wasmClassify returns parseable JSON and does not throw", () => {
    fc.assert(
      fc.property(commandishLineArb, localeArb, (line, locale) => {
        const raw = wasmClassify(line, locale)
        assertJsonOrNullString(raw)
        JSON.parse(raw)
      }),
      { numRuns: 40 }
    )
  })

  it("wasmParsePipe / wasmParseCompound / wasmPlanCompound never throw", () => {
    fc.assert(
      fc.property(commandishLineArb, (line) => {
        for (const call of [wasmParsePipe, wasmParseCompound, wasmPlanCompound]) {
          let raw: string
          try {
            raw = call(line)
          } catch (e) {
            assert.fail(`${call.name} threw on ${JSON.stringify(line)}: ${String(e)}`)
          }
          assert.equal(typeof raw, "string")
          assert.ok(raw.length > 0)
          JSON.parse(raw)
        }
      }),
      { numRuns: 40 }
    )
  })

  it("pure random lines: host entrypoints return strings (no uncaught panic)", () => {
    fc.assert(
      fc.property(lineArb, localeArb, (line, locale) => {
        const runners: Array<() => string> = [
          () => wasmComplete(line, Math.min(line.length, Math.max(0, line.length - 1))),
          () => wasmRun(line, locale),
          () => wasmClassify(line, locale),
          () => wasmParsePipe(line),
          () => wasmParseCompound(line),
          () => wasmPlanCompound(line)
        ]
        for (const runOne of runners) {
          let raw: string
          try {
            raw = runOne()
          } catch (e) {
            assert.fail(`boundary threw on ${JSON.stringify(line)}: ${String(e)}`)
          }
          assert.equal(typeof raw, "string")
        }
      }),
      { numRuns: 50 }
    )
  })
})
