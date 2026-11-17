/**
 * EN: Incomplete `-list` producers must fail via Rust exitStatus — not succeed and then
 * surface a misleading `pipe.error.notProducer` after stdout suppression.
 * JA: 不完全な `-list` 左辺は Rust exitStatus で失敗。成功扱い→notProducer 化を防ぐ。
 */
import assert from "node:assert/strict"
import { before, describe, it } from "node:test"
import { ensureBmxtCoreForTests } from "../../../../../shared/lib/features/bmxt-core/test-ensure-wasm.ts"
import { wasmRun } from "../../../../../shared/lib/features/bmxt-core/wasm-host.ts"
import { segmentOutcomeFromLines } from "../../../../../shared/lib/features/command-line/compound/classify-outcome.ts"
import {
  EXIT_MISUSE,
  EXIT_SUCCESS,
  isExitSuccess
} from "../../../../../shared/lib/features/command-line/compound/exit-status.ts"
import { matchPlainListCommand } from "../../../../../shared/lib/features/command-line/list-commands/registry.ts"

before(() => {
  ensureBmxtCoreForTests()
})

type WasmBundle = {
  ty: string
  msgs?: Array<{ key?: string }>
  action?: { kind?: string }
  exitStatus?: number
}

function parseWasmBundle(raw: string): WasmBundle {
  const parsed: unknown = JSON.parse(raw)
  assert.ok(parsed !== null && typeof parsed === "object")
  return parsed as WasmBundle
}

describe("pipe producer usage failure (WASM exitStatus)", () => {
  it("rejects incomplete tab -list --device as plain-list match", () => {
    assert.equal(matchPlainListCommand("tab -list --device"), null)
  })

  it("WASM stamps exitStatus=2 (misuse) for tab -list --device", () => {
    const bundle = parseWasmBundle(wasmRun("tab -list --device", "en"))
    assert.equal(bundle.ty, "msgs")
    assert.equal(bundle.exitStatus, EXIT_MISUSE)
    const keys = (bundle.msgs ?? [])
      .map((m) => m.key)
      .filter((k): k is string => typeof k === "string")
    assert.ok(
      keys.includes("cmd.tabs.error.invalidListUsage"),
      `expected invalidListUsage, got ${JSON.stringify(keys)}`
    )
  })

  it("maps stamped exitStatus to failure without relying on line scrape", () => {
    const lines = ["expanded usage text"]
    const outcome = segmentOutcomeFromLines(lines, EXIT_MISUSE)
    assert.equal(outcome.ok, false)
    assert.equal(isExitSuccess(outcome.exitStatus), false)
    assert.equal(outcome.exitStatus, EXIT_MISUSE)
    assert.deepEqual(outcome.stdout, [])
    assert.deepEqual(outcome.stderr, lines)
  })

  it("WASM keeps valid tab -list --peers as ui open_plain_list (exit 0 omitted)", () => {
    assert.notEqual(matchPlainListCommand("tab -list --peers"), null)
    const bundle = parseWasmBundle(wasmRun("tab -list --peers", "en"))
    assert.equal(bundle.ty, "ui")
    assert.equal(bundle.action?.kind, "open_plain_list")
    assert.equal(bundle.exitStatus ?? EXIT_SUCCESS, EXIT_SUCCESS)
  })
})
