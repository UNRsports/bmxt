import { wasmTabsPickerTarget } from "../wasm-host"

function parseWasmJson<T>(raw: string): T {
  const parsed = JSON.parse(raw) as T | { error?: string }
  if (parsed && typeof parsed === "object" && "error" in parsed && parsed.error) {
    throw new Error(String(parsed.error))
  }
  return parsed as T
}

export function resolveTabsPickerTarget<TContext, TResult>(context: TContext): TResult {
  const raw = wasmTabsPickerTarget(JSON.stringify(context))
  return parseWasmJson<TResult>(raw)
}
