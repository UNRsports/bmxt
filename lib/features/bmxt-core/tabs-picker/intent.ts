import { wasmTabsPickerEnterIntent } from "../wasm-host"

function parseWasmJson<T>(raw: string): T {
  const parsed = JSON.parse(raw) as T | { error?: string }
  if (parsed && typeof parsed === "object" && "error" in parsed && parsed.error) {
    throw new Error(String(parsed.error))
  }
  return parsed as T
}

export function resolveTabsPickerEnterIntent<TContext, TIntent>(context: TContext): TIntent {
  const raw = wasmTabsPickerEnterIntent(JSON.stringify(context))
  return parseWasmJson<TIntent>(raw)
}
