import {
  wasmTabsPickerConfirmPlan,
  wasmTabsPickerMovePlan
} from "../wasm-host.ts"
import { parseWasmJson } from "./parse-wasm-json.ts"

export function resolveTabsPickerConfirmPlan<TContext, TResult>(context: TContext): TResult {
  const raw = wasmTabsPickerConfirmPlan(JSON.stringify(context))
  return parseWasmJson<TResult>(raw)
}

export function resolveTabsPickerMovePlan<TContext, TResult>(context: TContext): TResult {
  const raw = wasmTabsPickerMovePlan(JSON.stringify(context))
  return parseWasmJson<TResult>(raw)
}
