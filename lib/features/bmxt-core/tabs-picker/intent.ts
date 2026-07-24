import { wasmTabsPickerEnterIntent } from "../wasm-host"
import { parseWasmJson } from "./parse-wasm-json"

export function resolveTabsPickerEnterIntent<TContext, TIntent>(context: TContext): TIntent {
  const raw = wasmTabsPickerEnterIntent(JSON.stringify(context))
  return parseWasmJson<TIntent>(raw)
}
