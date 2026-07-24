import { wasmTabsPickerTarget } from "../wasm-host"
import { parseWasmJson } from "./parse-wasm-json"

export function resolveTabsPickerTarget<TContext, TResult>(context: TContext): TResult {
  const raw = wasmTabsPickerTarget(JSON.stringify(context))
  return parseWasmJson<TResult>(raw)
}
