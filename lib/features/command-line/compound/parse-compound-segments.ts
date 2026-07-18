import { isBmxtCoreReady, wasmParseCompound } from "../../bmxt-core/wasm-host.ts"

export type CompoundOperator = "&&" | "||" | ";"

export type ParseCompoundSegmentsResult =
  | { ok: true; segments: string[]; operators: CompoundOperator[] }
  | { ok: false; error: "unclosed_quote" | "dangling_operator" | "empty_segment" }

type WasmCompoundResult =
  | { ok: true; segments: string[]; operators: string[] }
  | { ok: false; error: "unclosed_quote" | "dangling_operator" | "empty_segment" }

/** EN: True when the line contains a top-level `&&`, `||`, or `;` (ignores quoted regions). */
export function lineHasListOperator(line: string): boolean {
  const parsed = parseCompoundSegments(line)
  return parsed.ok && parsed.segments.length > 1
}

/**
 * EN: Split on `&&` / `||` / `;` via Rust/WASM.
 * JA: リスト演算子分割は Rust/WASM。
 * Requires `ensureBmxtCore()` beforehand.
 */
export function parseCompoundSegments(line: string): ParseCompoundSegmentsResult {
  if (!isBmxtCoreReady()) {
    throw new Error(
      "BMXt core WASM not initialized; call ensureBmxtCore() before parseCompoundSegments"
    )
  }
  const raw = wasmParseCompound(line)
  const parsed = JSON.parse(raw) as WasmCompoundResult
  if (parsed.ok === true) {
    return {
      ok: true,
      segments: parsed.segments,
      operators: parsed.operators as CompoundOperator[]
    }
  }
  return { ok: false, error: parsed.error }
}
