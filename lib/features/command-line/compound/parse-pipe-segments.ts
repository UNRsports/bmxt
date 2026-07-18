import { isBmxtCoreReady, wasmParsePipe } from "../../bmxt-core/wasm-host.ts"
import type { ParseAndSegmentsResult } from "./types.ts"

export type ParsePipeSegmentsResult = ParseAndSegmentsResult

type WasmPipeResult =
  | { ok: true; segments: string[] }
  | { ok: false; error: "unclosed_quote" | "dangling_operator" | "empty_segment" }

/** EN: True when the line contains a top-level `|` (ignores quoted regions). */
export function lineHasPipeOperator(line: string): boolean {
  const parsed = parsePipeSegments(line)
  return parsed.ok && parsed.segments.length > 1
}

/**
 * EN: Split on `|` via Rust/WASM (POSIX-inspired quoting).
 * JA: `|` 分割は Rust/WASM（クォート内・エスケープは演算子にしない）。
 * Requires `ensureBmxtCore()` beforehand.
 */
export function parsePipeSegments(line: string): ParsePipeSegmentsResult {
  if (!isBmxtCoreReady()) {
    throw new Error("BMXt core WASM not initialized; call ensureBmxtCore() before parsePipeSegments")
  }
  const raw = wasmParsePipe(line)
  const parsed = JSON.parse(raw) as WasmPipeResult
  if (parsed.ok === true) {
    return { ok: true, segments: parsed.segments }
  }
  return { ok: false, error: parsed.error }
}
