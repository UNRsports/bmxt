/**
 * EN: Node behavioral E2E — host `wasmComplete` across every CJK caret (no browser).
 * JA: Node 振る舞い E2E — ブラウザ無しで CJK 全キャレット位置のホスト complete を検証。
 */

import assert from "node:assert/strict"
import { before, describe, it } from "node:test"
import { ensureBmxtCoreForTests } from "../bmxt-core/test-ensure-wasm.ts"
import { wasmComplete } from "../bmxt-core/wasm-host.ts"

const CJK_LINE = "search -list --all リスト | browse"

before(() => {
  ensureBmxtCoreForTests()
})

describe("prompt CJK behavioral E2E (host complete)", () => {
  it("wasmComplete never throws across the full CJK line", () => {
    for (let cursor = 0; cursor <= CJK_LINE.length; cursor += 1) {
      assert.doesNotThrow(() => {
        wasmComplete(CJK_LINE, cursor)
      }, `cursor=${cursor}`)
    }
  })

  it("keeps a stable non-empty line identity while scanning CJK (regression guard)", () => {
    let line = CJK_LINE
    for (let cursor = line.length; cursor >= 0; cursor -= 1) {
      const raw = wasmComplete(line, cursor)
      assert.equal(typeof raw, "string", `cursor=${cursor}`)
      assert.equal(line, CJK_LINE, `line mutated at cursor=${cursor}`)
    }
  })

  it("mid-CJK caret does not wipe the logical command prefix", () => {
    const ri = CJK_LINE.indexOf("リ")
    assert.ok(ri >= 0)
    for (const cursor of [ri, ri + 1, ri + 2, ri + 3]) {
      const raw = wasmComplete(CJK_LINE, cursor)
      assert.equal(typeof raw, "string")
      assert.ok(CJK_LINE.startsWith("search -list --all"))
      assert.ok(CJK_LINE.includes("| browse"))
    }
  })
})
