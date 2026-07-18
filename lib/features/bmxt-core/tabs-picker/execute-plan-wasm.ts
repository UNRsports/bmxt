import {
  wasmTabsPickerConfirmPlan,
  wasmTabsPickerMovePlan
} from "../wasm-host.ts"

function parseWasmJson<T>(raw: string): T {
  const parsed = JSON.parse(raw) as T | { error?: string }
  if (parsed && typeof parsed === "object" && "error" in parsed && parsed.error) {
    throw new Error(String(parsed.error))
  }
  return parsed as T
}

export function resolveTabsPickerConfirmPlan<TContext, TResult>(context: TContext): TResult {
  const raw = wasmTabsPickerConfirmPlan(JSON.stringify(context))
  return parseWasmJson<TResult>(raw)
}

export function resolveTabsPickerMovePlan<TContext, TResult>(context: TContext): TResult {
  const raw = wasmTabsPickerMovePlan(JSON.stringify(context))
  return parseWasmJson<TResult>(raw)
}
