/**
 * EN: Pipe-producer contracts — stamped exitStatus maps to failure; bare `--device` is a
 * valid open_plain_list plan (empty id) for host browse / misuse, not a core msgs failure.
 * JA: pipe 左辺契約。stamp 済み exitStatus は失敗へ。ID なし `--device` は空 id の
 * open_plain_list（ホストが browse / misuse）でありコア msgs 失敗ではない。
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
  action?: {
    kind?: string
    device_id?: string
    device_scope?: string
  }
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

  it("WASM emits open_plain_list with empty device_id for tab -list --device", () => {
    const bundle = parseWasmBundle(wasmRun("tab -list --device", "en"))
    assert.equal(bundle.ty, "ui")
    assert.equal(bundle.action?.kind, "open_plain_list")
    assert.equal(bundle.action?.device_scope, "device")
    assert.equal(bundle.action?.device_id, "")
    assert.equal(bundle.exitStatus ?? EXIT_SUCCESS, EXIT_SUCCESS)
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
